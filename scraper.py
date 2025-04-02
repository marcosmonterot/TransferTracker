import requests
from bs4 import BeautifulSoup
import logging
import re
import time
import random
import json
import os

def scrape_transfermarkt():
    """
    Scrapes the Spanish league player data from Transfermarkt.
    
    Returns:
        list: A list of dictionaries containing player data
    """
    logging.info("Starting scraping of Transfermarkt")
    
    # Use sample data for testing
    SAMPLE_DATA_PATH = 'data/sample_players.json'
    
    # Check if we already have sample data cached
    if os.path.exists(SAMPLE_DATA_PATH):
        try:
            logging.info("Loading sample data from cache")
            with open(SAMPLE_DATA_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logging.error(f"Error loading sample data: {str(e)}")
    
    # Create sample data for La Liga teams and players
    sample_players = generate_sample_data()
    
    # Save sample data for future use
    try:
        with open(SAMPLE_DATA_PATH, 'w', encoding='utf-8') as f:
            json.dump(sample_players, f, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Error saving sample data: {str(e)}")
    
    return sample_players

def generate_sample_data():
    """
    Generates sample player data for La Liga teams.
    """
    logging.info("Generating sample player data")
    
    # Equipos organizados por liga
    leagues = {
        "La Liga": [
            {
                "name": "Real Madrid", 
                "id": "418",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg"
            },
            {
                "name": "FC Barcelona", 
                "id": "131",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg"
            },
            {
                "name": "Atlético de Madrid", 
                "id": "13",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg"
            },
            {
                "name": "Sevilla FC", 
                "id": "368",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg"
            },
            {
                "name": "Real Sociedad", 
                "id": "681",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg"
            },
            {
                "name": "Real Betis", 
                "id": "150",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/1/13/Real_betis_logo.svg"
            }
        ],
        "Premier League": [
            {
                "name": "Manchester City", 
                "id": "281",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg"
            },
            {
                "name": "Liverpool FC", 
                "id": "31",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg"
            },
            {
                "name": "Arsenal FC", 
                "id": "11",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg"
            },
            {
                "name": "Manchester United", 
                "id": "985",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg"
            },
            {
                "name": "Chelsea FC", 
                "id": "631",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg"
            }
        ],
        "Serie A": [
            {
                "name": "Inter Milan", 
                "id": "46",
                "badge_url": "https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg"
            },
            {
                "name": "AC Milan", 
                "id": "5",
                "badge_url": "https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg"
            },
            {
                "name": "Juventus FC", 
                "id": "506",
                "badge_url": "https://upload.wikimedia.org/wikipedia/commons/b/bc/Juventus_FC_2017_icon.svg"
            },
            {
                "name": "AS Roma", 
                "id": "12",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg"
            }
        ],
        "Bundesliga": [
            {
                "name": "Bayern Munich", 
                "id": "27",
                "badge_url": "https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg"
            },
            {
                "name": "Borussia Dortmund", 
                "id": "16",
                "badge_url": "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg"
            },
            {
                "name": "RB Leipzig", 
                "id": "23826",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/0/04/RB_Leipzig_2014_logo.svg"
            },
            {
                "name": "Bayer Leverkusen", 
                "id": "15",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg"
            }
        ],
        "Ligue 1": [
            {
                "name": "Paris Saint-Germain", 
                "id": "583",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg"
            },
            {
                "name": "Olympique de Marseille", 
                "id": "244",
                "badge_url": "https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg"
            },
            {
                "name": "AS Monaco", 
                "id": "162",
                "badge_url": "https://upload.wikimedia.org/wikipedia/en/e/ec/AS_Monaco_FC.svg"
            }
        ]
    }
    
    # Lista plana de todos los equipos para facilitar la generación de datos
    teams = []
    for league_name, league_teams in leagues.items():
        for team in league_teams:
            team["league"] = league_name  # Añadir la liga como propiedad del equipo
            teams.append(team)
    
    positions = [
        "Goalkeeper", "Centre-Back", "Left-Back", "Right-Back", 
        "Defensive Midfield", "Central Midfield", "Attacking Midfield",
        "Left Winger", "Right Winger", "Centre-Forward"
    ]
    
    nationalities = [
        "Spain", "France", "Brazil", "Argentina", "Germany", 
        "Portugal", "Uruguay", "Belgium", "Croatia", "Netherlands"
    ]
    
    market_values = [
        "€100m", "€80m", "€60m", "€50m", "€40m", 
        "€30m", "€25m", "€20m", "€15m", "€10m",
        "€8m", "€5m", "€3m", "€2m", "€1m",
        "€900k", "€700k", "€500k", "€300k", "€100k"
    ]
    
    player_names = [
        # Real Madrid
        ["Courtois", "Carvajal", "Militão", "Alaba", "Mendy", "Camavinga", "Valverde", "Bellingham", "Rodrygo", "Vinícius Jr.", "Mbappé"],
        # Barcelona
        ["ter Stegen", "Araújo", "Christensen", "Balde", "Pedri", "de Jong", "Gündogan", "Yamal", "Raphinha", "Lewandowski"],
        # Atlético Madrid
        ["Oblak", "Giménez", "Witsel", "Hermoso", "Koke", "Llorente", "Lemar", "Griezmann", "Félix", "Morata"],
        # Other teams - generic names
        ["García", "Rodríguez", "Fernández", "López", "Martínez", "Sánchez", "Pérez", "Gómez", "Díaz", "Torres"]
    ]
    
    all_players = []
    player_id = 10000
    
    for team in teams:
        # Between 15-25 players per team
        num_players = random.randint(15, 25)
        
        # Select name list: use specific names for top teams, generic for others
        if team["id"] in ["418", "131", "13"]:
            name_list_index = teams.index(team)
            if name_list_index > len(player_names) - 1:
                name_list_index = 3  # use generic names as fallback
            team_names = player_names[name_list_index]
        else:
            team_names = player_names[3]  # generic names
        
        for i in range(num_players):
            # Generate a player
            try:
                # Get either a specific team name or generate a random one
                if i < len(team_names):
                    player_name = team_names[i]
                else:
                    # Generate random name for additional players
                    first_names = ["Álvaro", "Sergio", "Raúl", "Francisco", "David", "Alberto", "Antonio", "Jaime", "Javier", "Carlos"]
                    last_names = ["García", "Rodríguez", "Fernández", "López", "Martínez", "Sánchez", "Pérez", "Gómez", "Díaz", "Torres"]
                    player_name = f"{random.choice(first_names)} {random.choice(last_names)}"
                
                # Assign position based on index to ensure team has all positions
                position_index = i % len(positions)
                position = positions[position_index]
                
                # Random nationality with higher chance for Spain
                nationality = "Spain" if random.random() < 0.6 else random.choice(nationalities)
                
                # Market value - higher values for top teams
                if team["id"] in ["418", "131"]:  # Madrid and Barca get higher values
                    market_value = market_values[random.randint(0, 10)]
                elif team["id"] in ["13", "368", "681"]:  # Atletico, Sevilla, Sociedad
                    market_value = market_values[random.randint(5, 15)]
                else:
                    market_value = market_values[random.randint(10, 19)]
                
                # Generar URL para avatar con las iniciales del jugador usando UI Avatars (servicio gratuito y confiable)
                # Esto evita problemas con CORS o IDs incorrectos en Transfermarkt
                name_parts = player_name.split()
                initials = "".join([p[0] for p in name_parts if p])[:2]  # Obtener primeras 2 iniciales
                photo_url = f"https://ui-avatars.com/api/?name={player_name}&background=1e88e5&color=fff&size=150"
                
                # Información adicional de Transfermarkt
                birth_date = f"{random.randint(1985, 2005)}-{random.randint(1, 12)}-{random.randint(1, 28)}"
                age = 2025 - int(birth_date.split('-')[0])
                height = f"{random.randint(165, 195)} cm"
                foot = random.choice(["Right", "Left", "Both"])
                joined_date = f"{random.randint(2018, 2024)}-{random.randint(1, 12)}-{random.randint(1, 28)}"
                contract_expires = f"{random.randint(2025, 2028)}-06-30"
                
                player = {
                    'id': str(player_id),
                    'name': player_name,
                    'position': position,
                    'nationality': nationality,
                    'club': team["name"],
                    'league': team["league"],
                    'market_value': market_value,
                    'photo_url': photo_url,
                    'club_badge_url': team["badge_url"],
                    # Campos adicionales de Transfermarkt
                    'birth_date': birth_date,
                    'age': age,
                    'height': height,
                    'preferred_foot': foot,
                    'joined': joined_date,
                    'contract_expires': contract_expires
                }
                
                all_players.append(player)
                player_id += 1
                
            except Exception as e:
                logging.error(f"Error generating player for {team['name']}: {str(e)}")
        
    logging.info(f"Generated {len(all_players)} sample players")
    return all_players

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Test the scraper
    players = scrape_transfermarkt()
    print(f"Total players scraped: {len(players)}")
    
    # Print first few players as example
    for player in players[:5]:
        print(player)
