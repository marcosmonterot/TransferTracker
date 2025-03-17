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
        json.dump({"favorites": [], "comments": {}}, f)

def get_user_data():
    try:
        with open(USER_DATA_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        # Return default structure if file doesn't exist or is invalid
        return {"favorites": [], "comments": {}}

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
    
    # Add favorite status to each player
    for player in players:
        player['favorite'] = player['id'] in user_data.get('favorites', [])
        player['comment'] = user_data.get('comments', {}).get(player['id'], '')
    
    # Sort players by percentile in descending order (highest first)
    players = sorted(players, key=lambda x: x.get('percentile', 0), reverse=True)
    
    return jsonify(players)

@app.route('/api/toggle_favorite', methods=['POST'])
def toggle_favorite():
    player_id = request.json.get('player_id')
    if not player_id:
        return jsonify({"success": False, "message": "No player ID provided"}), 400
    
    user_data = get_user_data()
    
    if player_id in user_data.get('favorites', []):
        user_data['favorites'].remove(player_id)
        status = False
    else:
        if 'favorites' not in user_data:
            user_data['favorites'] = []
        user_data['favorites'].append(player_id)
        status = True
    
    save_user_data(user_data)
    return jsonify({"success": True, "favorite": status})

@app.route('/api/add_comment', methods=['POST'])
def add_comment():
    player_id = request.json.get('player_id')
    comment = request.json.get('comment')
    
    if not player_id:
        return jsonify({"success": False, "message": "No player ID provided"}), 400
    
    user_data = get_user_data()
    
    if 'comments' not in user_data:
        user_data['comments'] = {}
    
    user_data['comments'][player_id] = comment
    save_user_data(user_data)
    
    return jsonify({"success": True})

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
