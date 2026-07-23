# Crop Disease Prediction — Fixed

## What was broken

1. **Wrong class order (main bug).** `main.py` had a hand-typed `class_names` list
   that did not match the order Keras assigned during training. `image_dataset_from_directory`
   labels classes by **alphabetically sorted** folder name — your hardcoded list wasn't
   in that order, so `class_names[predicted_index]` pointed at the wrong disease name
   for almost every prediction.

2. **Double normalization.** Your trained model has a `Rescaling(1./255)` layer built
   in as its *first* layer, so it expects raw `0–255` pixel values. `main.py` was
   dividing pixels by 255 *before* passing them to the model, so the model was
   normalizing already-normalized data — pixel values ended up around `[0, 0.0039]`,
   i.e. a nearly all-black image, which produced near-random predictions.

Both bugs compound: even with normalization fixed, using the wrong class list still
mislabels the result, and vice versa.

## What was fixed

- `main.py` now loads `class_names.json` instead of a hardcoded list, and asserts at
  startup that the class count matches the model's output size.
- `main.py` no longer divides pixels by 255 before prediction (the model does that
  internally).
- The notebook (`Crop_Disease_Prediction_fixed.ipynb`) has a new cell right after the
  train/validation datasets are created that saves `train_dataset.class_names` to
  `class_names.json` — the guaranteed, correct index → label mapping — plus a
  download cell so it leaves Colab alongside the `.keras` file.
- `script.js` no longer has the leftover `alert(...)` debug calls that would pop up
  browser dialogs on every click for real users.

## Folder layout expected by `main.py`

```
project/
├── backend/
│   └── main.py
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
└── model/
    ├── crop_disease_model.keras
    └── class_names.json
```

`main.py` looks for the model and class list at `../model/crop_disease_model.keras`
and `../model/class_names.json` relative to itself — so run it from inside `backend/`,
or adjust the paths.

## `class_names.json` — important caveat

I regenerated this by alphabetically sorting the class list you had hardcoded in the
old `main.py`. This **should** match what `image_dataset_from_directory` assigned
during your actual training run, since PlantVillage's folder names are standard and
Python's sort is deterministic — but the only 100% guaranteed source of truth is
`train_dataset.class_names` captured live during that training run.

**Recommended next step:** re-run the new notebook cell (even without retraining —
just re-run the dataset-loading cells against the same `data_dir`) to regenerate
`class_names.json` directly from `train_dataset.class_names`, and swap it into
`model/`. If it matches the file here exactly, you've confirmed everything lines up.

## The one piece you still need to add

**`model/crop_disease_model.keras` is not included here** — I only ever received your
notebook, not the trained model file itself. Everything else (backend, frontend,
class_names.json) is wired to expect it at:

```
crop-disease-prediction-fixed/model/crop_disease_model.keras
```

Get it by running the notebook (`Crop_Disease_Prediction_fixed.ipynb`) top to bottom
in Colab — the last cells save and download `crop_disease_model.keras` and
`class_names.json` for you. Drop `crop_disease_model.keras` into `model/`
(and optionally overwrite `model/class_names.json` with the freshly downloaded one,
per the caveat above). If it's missing, `main.py` now raises a clear
`FileNotFoundError` telling you exactly what to do, instead of failing silently.

## How everything connects

- `index.html` loads `style.css` and `script.js` by relative path — all three **must
  stay in the same `frontend/` folder**.
- `script.js` talks to the backend at the hardcoded URL `http://127.0.0.1:8000/predict`.
  If you serve the frontend from anywhere other than `127.0.0.1:5500` /
  `localhost:5500`, update `allow_origins` in `main.py` to match, or the browser will
  block the request with a CORS error.
- `main.py` loads `../model/crop_disease_model.keras` and `../model/class_names.json`
  relative to itself, so it must be run **from inside `backend/`** (paths won't
  resolve if you run it from the project root).

## How to run

```bash
# 1. Install backend dependencies
cd backend
pip install -r requirements.txt

# 2. Make sure model/crop_disease_model.keras exists (see above)

# 3. Start the backend (must be run from inside backend/)
uvicorn main:app --reload --port 8000
```

Leave that running, then in a separate terminal/tab serve the frontend:

```bash
cd frontend
python3 -m http.server 5500
# or use VS Code's "Live Server" extension on port 5500
```

Open `http://localhost:5500` in your browser, upload a leaf image, click
**Predict Disease**. If the backend isn't running or CORS origins don't match,
you'll see the "❌ Backend not connected." toast — check the terminal running
`uvicorn` for the actual error.
