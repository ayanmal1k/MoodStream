from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import requests
from datetime import datetime
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)
CORS(app)

# TMDb API setup
TMDB_API_KEY = "fb7bb23f03b6994dafc674c074d01761" #Public TMDb API
TMDB_BASE_URL = "https://api.themoviedb.org/3"

# Load and clean Netflix dataset
netflix_data = pd.read_csv('netflix_titles.csv')

def clean_data():
    global netflix_data
    netflix_data.fillna({'description': '', 'director': '', 'cast': ''}, inplace=True)
    netflix_data['date_added'] = pd.to_datetime(netflix_data['date_added'], errors='coerce')
    netflix_data['release_year'] = netflix_data['release_year'].astype('Int64')
    netflix_data['content_features'] = (
        netflix_data['director'] + ' ' +
        netflix_data['cast'] + ' ' +
        netflix_data['listed_in'] + ' ' +
        netflix_data['description']
    )

clean_data()

# TF-IDF similarity setup
tfidf = TfidfVectorizer(stop_words='english')
tfidf_matrix = tfidf.fit_transform(netflix_data['content_features'])
cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)
indices = pd.Series(netflix_data.index, index=netflix_data['title']).drop_duplicates()

# TMDb detail fetching
def get_tmdb_details(title, media_type=None):
    item = netflix_data[netflix_data['title'] == title]
    if not media_type and not item.empty:
        media_type = 'movie' if item.iloc[0]['type'] == 'Movie' else 'tv'

    if media_type:
        search_url = f"{TMDB_BASE_URL}/search/{media_type}"
        response = requests.get(search_url, params={'api_key': TMDB_API_KEY, 'query': title})

        if response.status_code == 200 and response.json().get('results'):
            result = response.json()['results'][0]
            details_url = f"{TMDB_BASE_URL}/{media_type}/{result['id']}"
            details_response = requests.get(details_url, params={
                'api_key': TMDB_API_KEY,
                'append_to_response': 'credits,videos'
            })

            if details_response.status_code == 200:
                details = details_response.json()
                return {
                    'id': details['id'],
                    'title': details.get('title') or details.get('name', ''),
                    'overview': details.get('overview', ''),
                    'poster_path': details.get('poster_path', ''),
                    'backdrop_path': details.get('backdrop_path', ''),
                    'year': details.get('release_date', '')[:4] if media_type == 'movie' else details.get('first_air_date', '')[:4],
                    'rating': details.get('vote_average', 0),
                    'genres': [genre['name'] for genre in details.get('genres', [])],
                    'duration': details.get('runtime', 0) if media_type == 'movie' else (
                        sum(details.get('episode_run_time', [])) / len(details.get('episode_run_time', [])) if details.get('episode_run_time') else 0
                    ),
                    'media_type': media_type
                }

    if not item.empty:
        return {
            'id': str(item.index[0]),
            'title': title,
            'overview': item.iloc[0]['description'],
            'year': item.iloc[0]['release_year'],
            'duration': item.iloc[0].get('duration', ''),
            'genres': item.iloc[0]['listed_in'].split(', '),
            'media_type': 'movie' if item.iloc[0]['type'] == 'Movie' else 'tv'
        }

    return None

# Recommendation by content similarity
def get_content_recommendations(title, count=10):
    try:
        idx = indices[title]
        sim_scores = sorted(enumerate(cosine_sim[idx]), key=lambda x: x[1], reverse=True)[1:count+1]
        movie_indices = [i[0] for i in sim_scores]
        return netflix_data.iloc[movie_indices]['title'].tolist()
    except KeyError:
        return []

# Mood-based recommendations
def get_mood_recommendations(mood, count=10):
    mood_genres = {
        'Happy': ['Comedy', 'Family', 'Animation', 'Musical'],
        'Sad': ['Drama', 'Romance', 'Documentary'],
        'Excited': ['Action', 'Adventure', 'Sci-Fi', 'Thriller'],
        'Chill': ['Documentary', 'Reality TV', 'Food', 'Travel'],
        'Focused': ['Documentary', 'Science & Nature', 'Historical']
    }

    genres = mood_genres.get(mood, [])
    if genres:
        pattern = '|'.join(genres)
        filtered_data = netflix_data[netflix_data['listed_in'].str.contains(pattern, case=False, regex=True)]
    else:
        filtered_data = netflix_data

    if len(filtered_data) < count:
        filtered_data = pd.concat([filtered_data, netflix_data.sample(count - len(filtered_data))]).drop_duplicates()

    return filtered_data.sample(n=min(count, len(filtered_data)))['title'].tolist()

# Time-of-day based recommendations
def get_time_recommendations(time_of_day=None, day_type=None, count=10):
    hour = datetime.now().hour
    time_of_day = time_of_day or (
        'morning' if 5 <= hour < 12 else
        'afternoon' if 12 <= hour < 17 else
        'evening' if 17 <= hour < 22 else 'night'
    )

    weekday = datetime.now().weekday()
    day_type = day_type or ('weekend' if weekday >= 5 else 'weekday')

    time_content = {
        'morning': {'weekday': ['Documentary', 'News', 'Talk-Show', 'Kids'], 'weekend': ['Animation', 'Family', 'Comedy']},
        'afternoon': {'weekday': ['Comedy', 'Reality TV', 'Drama'], 'weekend': ['Adventure', 'Action', 'Sci-Fi']},
        'evening': {'weekday': ['Comedy', 'Drama', 'Action'], 'weekend': ['Action', 'Thriller', 'Romance']},
        'night': {'weekday': ['Horror', 'Crime', 'Documentary'], 'weekend': ['Horror', 'Thriller', 'Comedy']}
    }

    genres = time_content.get(time_of_day, {}).get(day_type, [])
    if genres:
        pattern = '|'.join(genres)
        filtered_data = netflix_data[netflix_data['listed_in'].str.contains(pattern, case=False, regex=True)]
    else:
        filtered_data = netflix_data

    if len(filtered_data) < count:
        filtered_data = pd.concat([filtered_data, netflix_data.sample(count - len(filtered_data))]).drop_duplicates()

    return filtered_data.sample(n=min(count, len(filtered_data)))['title'].tolist()

# ========== API ROUTES ==========

@app.route('/api/recommendations', methods=['GET'])
def recommendations():
    rec_type = request.args.get('type', 'smart')
    count = int(request.args.get('count', 12))

    if rec_type == 'mood':
        titles = get_mood_recommendations(request.args.get('mood'), count)
    elif rec_type == 'time':
        titles = get_time_recommendations(request.args.get('time'), request.args.get('day'), count)
    elif rec_type == 'similar':
        titles = get_content_recommendations(request.args.get('title'), count)
    else:
        titles = netflix_data.sample(n=count)['title'].tolist()

    results = [get_tmdb_details(title) for title in titles]
    return jsonify({"results": [r for r in results if r]})

@app.route('/api/movie/<title>', methods=['GET'])
def get_movie(title):
    details = get_tmdb_details(title, request.args.get('type'))
    if details:
        return jsonify({"status": "success", "data": details})
    return jsonify({"status": "error", "message": "Movie not found"}), 404

@app.route('/api/genres', methods=['GET'])
def get_genres():
    genres = set(g.strip() for sublist in netflix_data['listed_in'].dropna().str.split(',') for g in sublist)
    return jsonify({"status": "success", "data": sorted(genres)})

@app.route('/api/surprise', methods=['GET'])
def surprise():
    random_title = netflix_data.sample(n=1).iloc[0]['title']
    details = get_tmdb_details(random_title)
    if details:
        return jsonify({"status": "success", "data": details})
    return jsonify({"status": "error", "message": "Failed to get surprise recommendation"}), 500

@app.route('/api/filter', methods=['GET'])
def filter_content():
    genres = request.args.get('genres', '').split(',')
    year_min = int(request.args.get('year_min', '1900'))
    year_max = int(request.args.get('year_max', '2025'))
    content_type = request.args.get('type', 'all')
    count = int(request.args.get('count', 12))

    filtered_data = netflix_data.copy()
    filtered_data = filtered_data[(filtered_data['release_year'] >= year_min) & (filtered_data['release_year'] <= year_max)]

    if content_type == 'movie':
        filtered_data = filtered_data[filtered_data['type'] == 'Movie']
    elif content_type == 'tv':
        filtered_data = filtered_data[filtered_data['type'] == 'TV Show']

    if genres and genres[0]:
        pattern = '|'.join(genres)
        filtered_data = filtered_data[filtered_data['listed_in'].str.contains(pattern, case=False, regex=True)]

    count = min(count, len(filtered_data))
    recommendations = filtered_data.sample(n=count)

    results = [get_tmdb_details(row['title']) for _, row in recommendations.iterrows()]
    return jsonify({
        "status": "success",
        "data": [r for r in results if r],
        "total_results": len(filtered_data)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
