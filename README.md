
# 🎬 MoodStream - Smart Netflix Recommender

MoodStream is an AI-powered movie and TV show recommender system that curates personalized Netflix suggestions based on your **mood**, **time of day**, and **watch preferences**. Say goodbye to endless scrolling and hello to smart, tailored recommendations!

---

## 🧠 Features

- 🎭 **Mood-Based Recommendations** (Happy, Sad, Chill, Focused, Excited)
- 🕒 **Time-of-Day Suggestions** (Morning, Afternoon, Evening, Night)
- 🔍 **Smart Filtering** (Genre, Release Year, Content Type)
- 📊 **Content-Based Similar Recommendations**
- 🎲 **Surprise Me** Button (Random Picks)
- 🕘 **Watch History Tracking** (Locally in browser)
- 🎨 Sleek and responsive UI (HTML, CSS, JavaScript)
- 🧠 Powered by TMDb API + Netflix Dataset + Flask backend

---

## 🗂 Folder Structure

```
MoodStream/
├── api/                    # Flask backend (Vercel-compatible)
│   └── index.py
├── static/
│   ├── css/
│   ├── js/
│   └── images/
├── templates/
│   └── index.html
├── netflix_titles.csv      # Netflix dataset from Kaggle
├── vercel.json             # Vercel deployment config
├── requirements.txt        # Python dependencies
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/moodstream.git
cd moodstream
```

### 2. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 3. Run locally

```bash
cd api
flask run
```

Open `http://localhost:5000` in your browser.


## 📦 Dataset

Netflix dataset used from [Kaggle - Netflix Movies and TV Shows](https://www.kaggle.com/datasets/shivamb/netflix-shows)

---

## 🛠 Built With

- [Flask](https://flask.palletsprojects.com/)
- [TMDb API](https://www.themoviedb.org/)
- [JavaScript + HTML + CSS](https://developer.mozilla.org/)
- [Vercel](https://vercel.com/)
- [Pandas + Sklearn](https://scikit-learn.org/)

---

## 🧑‍💻 Author

**Ayan Malik**  
📬 [LinkedIn](https://linkedin.com/in/ayanmal1k) | 💻 [GitHub](https://github.com/ayanmal1k)

---

## 📄 License

This project is licensed under the MIT License.

---
