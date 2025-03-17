import requests
from bs4 import BeautifulSoup
import logging
import re
import time
import random

def scrape_transfermarkt():
    """
    Scrapes the Spanish league player data from Transfermarkt.
    
    Returns:
        list: A list of dictionaries containing player data
    """
    logging.info("Starting scraping of Transfermarkt")
    
    # Base URL for La Liga (Spanish League)
    base_url = "https://www.transfermarkt.com"
    la_liga_url = f"{base_url}/laliga/startseite/wettbewerb/ES1"
    
    # Headers to avoid being blocked
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
    
    try:
        # Get the La Liga page to extract teams
        response = requests.get(la_liga_url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all team links in the table
        team_links = []
        teams_table = soup.select_one("table.items")
        if teams_table:
            for team_row in teams_table.select("tr.odd, tr.even"):
                team_link_element = team_row.select_one("td.hauptlink a")
                if team_link_element and team_link_element.has_attr('href'):
                    team_url = team_link_element['href']
                    if "/startseite/verein/" in team_url:
                        team_links.append(base_url + team_url)
        
        if not team_links:
            logging.error("No team links found. Website structure might have changed.")
            return []
        
        logging.info(f"Found {len(team_links)} teams")
        
        all_players = []
        
        # For each team, get their squad
        for team_url in team_links:
            # Add a random delay to avoid being blocked
            time.sleep(random.uniform(1, 3))
            
            try:
                team_name = team_url.split("/")[-3]
                logging.info(f"Scraping team: {team_name}")
                
                response = requests.get(team_url, headers=headers)
                response.raise_for_status()
                team_soup = BeautifulSoup(response.text, 'html.parser')
                
                # Extract team name
                team_name_elem = team_soup.select_one("h1.data-header__headline-wrapper")
                team_name = team_name_elem.text.strip() if team_name_elem else "Unknown Team"
                
                # Find the players table
                players_table = team_soup.select_one("table.items")
                
                if not players_table:
                    logging.warning(f"No players table found for {team_name}")
                    continue
                
                # Extract players data
                for player_row in players_table.select("tr.odd, tr.even"):
                    try:
                        # Player name and ID
                        player_link = player_row.select_one("td.hauptlink a")
                        if not player_link:
                            continue
                            
                        player_name = player_link.text.strip()
                        player_url = player_link['href']
                        player_id = re.search(r'/spieler/(\d+)', player_url)
                        player_id = player_id.group(1) if player_id else "unknown"
                        
                        # Position
                        position_cell = player_row.select_one("td.posrela")
                        position = position_cell.text.strip() if position_cell else "Unknown"
                        
                        # Nationality
                        nationality_img = player_row.select_one("td.zentriert img.flaggenrahmen")
                        nationality = nationality_img['title'] if nationality_img and nationality_img.has_attr('title') else "Unknown"
                        
                        # Market value
                        market_value_cell = player_row.select_one("td.rechts")
                        market_value = market_value_cell.text.strip() if market_value_cell else "€0"
                        
                        # Create player object
                        player = {
                            'id': player_id,
                            'name': player_name,
                            'position': position,
                            'nationality': nationality,
                            'club': team_name,
                            'market_value': market_value
                        }
                        
                        all_players.append(player)
                        
                    except Exception as e:
                        logging.error(f"Error processing player in {team_name}: {str(e)}")
                
            except Exception as e:
                logging.error(f"Error processing team {team_url}: {str(e)}")
        
        logging.info(f"Completed scraping. Total players found: {len(all_players)}")
        return all_players
        
    except Exception as e:
        logging.error(f"Error during scraping: {str(e)}")
        return []

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Test the scraper
    players = scrape_transfermarkt()
    print(f"Total players scraped: {len(players)}")
    
    # Print first few players as example
    for player in players[:5]:
        print(player)
