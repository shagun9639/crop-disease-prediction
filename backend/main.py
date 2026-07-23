from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import tensorflow as tf
import numpy as np
import json
import os

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================================
# Load Model
# ==========================================================
model_path = os.path.join("..", "model", "crop_disease_model.keras")

if not os.path.exists(model_path):
    raise FileNotFoundError(
        f"Model file not found at '{model_path}'. "
        f"Run the notebook, then copy crop_disease_model.keras into the "
        f"model/ folder (sibling of backend/ and frontend/), then restart "
        f"the server."
    )

model = tf.keras.models.load_model(model_path)

print("Output Shape:", model.output_shape)
print("Total Classes (model):", model.output_shape[-1])
print("=" * 50)

# ==========================================================
# FIX #1: Load class names from class_names.json instead of a
# hardcoded list. The hardcoded list was NOT in the same order
# that Keras assigned during training (image_dataset_from_directory
# sorts folder names alphabetically), so predicted indices were
# being mapped to the wrong disease names.
#
# class_names.json must be generated from train_dataset.class_names
# in the training notebook and shipped alongside the .keras model.
# See the "FIX: Save the class names..." cell added to the notebook.
# ==========================================================
class_names_path = os.path.join("..", "model", "class_names.json")

with open(class_names_path, "r") as f:
    class_names = json.load(f)

print("Total Classes (class_names.json):", len(class_names))
print("=" * 50)

# Safety check: catch a mismatch immediately at startup instead of
# silently returning wrong predictions later.
if len(class_names) != model.output_shape[-1]:
    raise RuntimeError(
        f"class_names.json has {len(class_names)} entries but the model "
        f"outputs {model.output_shape[-1]} classes. They must match. "
        f"Re-generate class_names.json from train_dataset.class_names."
    )


@app.get("/")
def home():
    return {
        "message": "Crop Disease Prediction API is Running 🚀"
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        # Read Image
        image = Image.open(file.file).convert("RGB")
        image.save("received_image.jpg")
        print("Image received and saved.")
        image = image.resize((224, 224))

        # ==========================================================
        # FIX #2: Do NOT divide by 255 here.
        #
        # The model itself contains a tf.keras.layers.Rescaling(1./255)
        # layer as its first layer (see the notebook). That means the
        # model already expects raw 0-255 pixel values as input.
        #
        # The old code divided by 255 here AND the model divided by 255
        # again internally, so the model was seeing pixel values in the
        # range [0, 0.0039] - effectively an almost-all-black image -
        # which produced garbage predictions.
        # ==========================================================
        img = np.array(image).astype(np.float32)  # keep 0-255 range
        img = np.expand_dims(img, axis=0)

        # Predict
        prediction = model.predict(img, verbose=0)

        # Debug Output
        print("\n" + "=" * 70)
        print("Prediction Array:")
        print(prediction)

        predicted_index = int(np.argmax(prediction))
        confidence = float(np.max(prediction))

        print("Predicted Index:", predicted_index)
        print("Predicted Class:", class_names[predicted_index])
        print("Confidence:", confidence)

        # Top 5 predictions
        top5_index = np.argsort(prediction[0])[-5:][::-1]

        print("\nTop 5 Predictions:")
        top5 = []

        for i in top5_index:
            print(f"{class_names[i]} --> {prediction[0][i]:.6f}")
            top5.append({
                "class": class_names[i],
                "score": float(prediction[0][i])
            })

        print("=" * 70 + "\n")

        return {
            "predicted_index": predicted_index,
            "prediction": class_names[predicted_index],
            "confidence": confidence,
            "top5": top5
        }

    except Exception as e:
        print("ERROR:", str(e))
        return {
            "error": str(e)
        }
