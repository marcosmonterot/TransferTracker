import os
import json
import logging
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from scraper import scrape_transfermarkt
import pandas as pd
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default-secret-key-for-development")

# Data file paths
PLAYERS_FILE = 'data/players.json'
USER_DATA_FILE = 'data/user_data.json'

# Ensure data directory exists
os.makedirs('data', exist_ok=True)

# Initialize user data file if it doesn't exist
if not os.path.exists(USER_DATA_FILE):
    with open(USER_DATA_FILE, 'w') as f:
        json.dump({
            "favorites": [],
            "comments": {},
            "favorite_lists": {
                "default": {
                    "name": "Favoritos",
                    "description": "Lista de favoritos predeterminada",
                    "players": []
                }
            }
        }, f)

def get_user_data():
    try:
        with open(USER_DATA_FILE, 'r') as f:
            data = json.load(f)
            
            # Ensure favorite_lists exists (for backward compatibility)
            if "favorite_lists" not in data:
                data["favorite_lists"] = {
                    "default": {
                        "name": "Favoritos",
                        "description": "Lista de favoritos predeterminada",
                        "players": data.get("favorites", [])
                    }
                }
            
            return data
    except (FileNotFoundError, json.JSONDecodeError):
        # Return default structure if file doesn't exist or is invalid
        return {
            "favorites": [],
            "comments": {},
            "favorite_lists": {
                "default": {
                    "name": "Favoritos",
                    "description": "Lista de favoritos predeterminada",
                    "players": []
                }
            }
        }

def save_user_data(data):
    with open(USER_DATA_FILE, 'w') as f:
        json.dump(data, f)

def get_players_data():
    try:
        # Check if we have cached data and if it's recent enough (less than 1 day old)
        if os.path.exists(PLAYERS_FILE):
            file_modified_time = os.path.getmtime(PLAYERS_FILE)
            current_time = datetime.now().timestamp()
            
            # If file is less than 24 hours old, use cached data
            if current_time - file_modified_time < 86400:  # 86400 seconds = 24 hours
                with open(PLAYERS_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
        
        # Otherwise, scrape fresh data
        logging.info("Scraping fresh data from Transfermarkt...")
        players = scrape_transfermarkt()
        
        # Calculate percentiles
        df = pd.DataFrame(players)
        
        # Convert market values to numeric for percentile calculation
        # Remove currency symbols and convert to float
        df['market_value_numeric'] = df['market_value'].apply(
            lambda x: float(x.replace('€', '').replace('m', '').replace(',', '.'))
            if 'm' in x else float(x.replace('€', '').replace('k', '').replace(',', '.')) / 1000
        )
        
        # Calculate percentile ranks
        df['percentile'] = df['market_value_numeric'].rank(pct=True) * 100
        df['percentile'] = df['percentile'].round().astype(int)
        
        # Convert back to list of dictionaries
        players_with_percentiles = df.drop('market_value_numeric', axis=1).to_dict('records')
        
        # Save to file
        with open(PLAYERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(players_with_percentiles, f, ensure_ascii=False)
        
        return players_with_percentiles
    
    except Exception as e:
        logging.error(f"Error getting players data: {str(e)}")
        # If there's an error but we have cached data, return that
        if os.path.exists(PLAYERS_FILE):
            try:
                with open(PLAYERS_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                pass
        # Otherwise return empty list
        return []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/players')
def get_players():
    players = get_players_data()
    user_data = get_user_data()
    
    # Add favorite status and comments to each player
    for player in players:
        player['favorite'] = player['id'] in user_data.get('favorites', [])
        
        # Manejamos los comentarios según el nuevo formato (lista de objetos con texto y timestamp)
        player_comments = user_data.get('comments', {}).get(player['id'], [])
        
        # Comprobamos si los comentarios están en el formato antiguo (string) y los convertimos
        if player_comments and isinstance(player_comments, str):
            # Convertir el comentario antiguo al nuevo formato
            player_comments = [{
                'text': player_comments,
                'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }]
            # Actualizar en los datos de usuario
            if 'comments' not in user_data:
                user_data['comments'] = {}
            user_data['comments'][player['id']] = player_comments
            save_user_data(user_data)
        
        player['comments'] = player_comments
    
    # Sort players by percentile in descending order (highest first)
    players = sorted(players, key=lambda x: x.get('percentile', 0), reverse=True)
    
    return jsonify(players)

@app.route('/api/toggle_favorite', methods=['POST'])
def toggle_favorite():
    player_id = request.json.get('player_id')
    list_id = request.json.get('list_id', 'default')  # Use default list if none provided
    
    if not player_id:
        return jsonify({"success": False, "message": "No player ID provided"}), 400
    
    user_data = get_user_data()
    
    # Initialize favorite_lists if needed
    if 'favorite_lists' not in user_data:
        user_data['favorite_lists'] = {
            "default": {
                "name": "Favoritos",
                "description": "Lista de favoritos predeterminada",
                "players": []
            }
        }
    
    # Ensure the list exists
    if list_id not in user_data['favorite_lists']:
        return jsonify({"success": False, "message": "List not found"}), 404
    
    # Toggle player in the specified list
    list_players = user_data['favorite_lists'][list_id]['players']
    if player_id in list_players:
        list_players.remove(player_id)
        status = False
    else:
        list_players.append(player_id)
        status = True
    
    # For backwards compatibility
    if list_id == 'default':
        if status:
            if 'favorites' not in user_data:
                user_data['favorites'] = []
            if player_id not in user_data['favorites']:
                user_data['favorites'].append(player_id)
        else:
            if player_id in user_data.get('favorites', []):
                user_data['favorites'].remove(player_id)
    
    save_user_data(user_data)
    return jsonify({
        "success": True, 
        "favorite": status,
        "list_id": list_id,
        "players": user_data['favorite_lists'][list_id]['players']
    })

@app.route('/api/add_comment', methods=['POST'])
def add_comment():
    player_id = request.json.get('player_id')
    comment = request.json.get('comment')
    
    if not player_id or not comment:
        return jsonify({"success": False, "message": "Player ID and comment are required"}), 400
    
    user_data = get_user_data()
    
    # Inicializar estructura para comentarios si no existe
    if 'comments' not in user_data:
        user_data['comments'] = {}
        
    # Inicializar lista de comentarios para este jugador si no existe
    if player_id not in user_data['comments']:
        user_data['comments'][player_id] = []
    
    # Crear nuevo comentario con timestamp
    new_comment = {
        'text': comment,
        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    # Añadir el comentario a la lista de comentarios del jugador
    user_data['comments'][player_id].append(new_comment)
    
    save_user_data(user_data)
    
    return jsonify({
        "success": True,
        "comments": user_data['comments'][player_id]
    })

# API routes for favorite lists
@app.route('/api/favorite_lists', methods=['GET'])
def get_favorite_lists():
    """Get all favorite lists"""
    user_data = get_user_data()
    return jsonify({"success": True, "lists": user_data.get('favorite_lists', {})})

@app.route('/api/favorite_lists', methods=['POST'])
def create_favorite_list():
    """Create a new favorite list"""
    list_name = request.json.get('name')
    list_description = request.json.get('description', '')
    
    if not list_name:
        return jsonify({"success": False, "message": "List name is required"}), 400
    
    user_data = get_user_data()
    
    # Generate a unique ID for the list
    import uuid
    list_id = str(uuid.uuid4())[:8]
    
    # Add the new list
    if 'favorite_lists' not in user_data:
        user_data['favorite_lists'] = {}
        
    user_data['favorite_lists'][list_id] = {
        "name": list_name,
        "description": list_description,
        "players": []
    }
    
    save_user_data(user_data)
    return jsonify({"success": True, "list_id": list_id, "list": user_data['favorite_lists'][list_id]})

@app.route('/api/favorite_lists/<list_id>', methods=['PUT'])
def update_favorite_list(list_id):
    """Update a favorite list's name or description"""
    list_name = request.json.get('name')
    list_description = request.json.get('description')
    
    user_data = get_user_data()
    
    if 'favorite_lists' not in user_data or list_id not in user_data['favorite_lists']:
        return jsonify({"success": False, "message": "List not found"}), 404
    
    if list_name:
        user_data['favorite_lists'][list_id]['name'] = list_name
    
    if list_description is not None:  # Allow empty descriptions
        user_data['favorite_lists'][list_id]['description'] = list_description
    
    save_user_data(user_data)
    return jsonify({"success": True, "list": user_data['favorite_lists'][list_id]})

@app.route('/api/favorite_lists/<list_id>', methods=['DELETE'])
def delete_favorite_list(list_id):
    """Delete a favorite list"""
    user_data = get_user_data()
    
    if 'favorite_lists' not in user_data or list_id not in user_data['favorite_lists']:
        return jsonify({"success": False, "message": "List not found"}), 404
    
    # Don't allow deleting the default list
    if list_id == 'default':
        return jsonify({"success": False, "message": "Cannot delete default list"}), 400
    
    del user_data['favorite_lists'][list_id]
    save_user_data(user_data)
    return jsonify({"success": True})

@app.route('/api/favorite_lists/<list_id>/players', methods=['POST'])
def add_player_to_list(list_id):
    """Add a player to a favorite list"""
    player_id = request.json.get('player_id')
    
    if not player_id:
        return jsonify({"success": False, "message": "Player ID is required"}), 400
    
    user_data = get_user_data()
    
    if 'favorite_lists' not in user_data or list_id not in user_data['favorite_lists']:
        return jsonify({"success": False, "message": "List not found"}), 404
    
    # Add player if not already in the list
    if player_id not in user_data['favorite_lists'][list_id]['players']:
        user_data['favorite_lists'][list_id]['players'].append(player_id)
    
    # For backwards compatibility, also update the main favorites list
    if list_id == 'default' and player_id not in user_data.get('favorites', []):
        if 'favorites' not in user_data:
            user_data['favorites'] = []
        user_data['favorites'].append(player_id)
    
    save_user_data(user_data)
    return jsonify({"success": True, "players": user_data['favorite_lists'][list_id]['players']})

@app.route('/api/favorite_lists/<list_id>/players/<player_id>', methods=['DELETE'])
def remove_player_from_list(list_id, player_id):
    """Remove a player from a favorite list"""
    user_data = get_user_data()
    
    if 'favorite_lists' not in user_data or list_id not in user_data['favorite_lists']:
        return jsonify({"success": False, "message": "List not found"}), 404
    
    # Remove player if in the list
    if player_id in user_data['favorite_lists'][list_id]['players']:
        user_data['favorite_lists'][list_id]['players'].remove(player_id)
    
    # For backwards compatibility, also update the main favorites list
    if list_id == 'default' and player_id in user_data.get('favorites', []):
        user_data['favorites'].remove(player_id)
    
    save_user_data(user_data)
    return jsonify({"success": True, "players": user_data['favorite_lists'][list_id]['players']})

@app.route('/api/refresh_data', methods=['POST'])
def refresh_data():
    try:
        # Delete the current players file to force a refresh
        if os.path.exists(PLAYERS_FILE):
            os.remove(PLAYERS_FILE)
        
        # Re-fetch the data
        players = get_players_data()
        return jsonify({"success": True, "count": len(players)})
    except Exception as e:
        logging.error(f"Error refreshing data: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
