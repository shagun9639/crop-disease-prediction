// ==========================================
// ELEMENTS
// ==========================================
const imageInput = document.getElementById("imageInput");
const previewImage = document.getElementById("previewImage");
const predictBtn = document.getElementById("predictBtn");

const loading = document.getElementById("loading");
const resultCard = document.getElementById("resultCard");

const prediction = document.getElementById("prediction");
const confidence = document.getElementById("confidence");
const progressBar = document.getElementById("progressBar");

const description = document.getElementById("description");
const symptoms = document.getElementById("symptoms");
const treatment = document.getElementById("treatment");
const prevention = document.getElementById("prevention");

const historyList = document.getElementById("historyList");
const predictionTime = document.getElementById("predictionTime");

let startTime = 0;

// ==========================================
// TOAST MESSAGE
// ==========================================

function showToast(message){

    let toast=document.querySelector(".toast");

    if(!toast){

        toast=document.createElement("div");

        toast.className="toast";

        document.body.appendChild(toast);

    }

    toast.innerHTML=message;

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },2500);

}

// ==========================================
// IMAGE PREVIEW
// ==========================================

imageInput.addEventListener("change",()=>{

    const file=imageInput.files[0];

    if(!file) return;

    const reader=new FileReader();

    reader.onload=function(e){

        previewImage.src=e.target.result;

        previewImage.style.display="block";

        previewImage.classList.add("fade");

    };

    reader.readAsDataURL(file);

});

// ==========================================
// DRAG & DROP
// ==========================================

const dropArea=document.getElementById("dropArea");

["dragenter","dragover"].forEach(event=>{

    dropArea.addEventListener(event,(e)=>{

        e.preventDefault();

        dropArea.style.borderColor="#86efac";

        dropArea.style.background="rgba(34,197,94,.18)";

    });

});

["dragleave","drop"].forEach(event=>{

    dropArea.addEventListener(event,(e)=>{

        e.preventDefault();

        dropArea.style.borderColor="#4ade80";

        dropArea.style.background="rgba(255,255,255,.05)";

    });

});

dropArea.addEventListener("drop",(e)=>{

    const files=e.dataTransfer.files;

    if(files.length){

        imageInput.files=files;

        const reader=new FileReader();

        reader.onload=function(ev){

            previewImage.src=ev.target.result;

            previewImage.style.display="block";

        };

        reader.readAsDataURL(files[0]);

    }

});

// ==========================================
// DISEASE INFORMATION DATABASE
// ==========================================
// NOTE: This only covers a handful of classes. Any prediction not
// listed here falls back to diseaseInfo["default"]. Add entries for
// the remaining classes (see class_names.json) as you go.

const diseaseInfo={

"Cherry_(including_sour)___healthy":{

    description:"The cherry plant is healthy and shows no visible signs of disease.",

    symptoms:"Leaves are green, fresh and free from fungal or bacterial infection.",

    treatment:"No treatment is required.",

    prevention:"Continue proper irrigation, balanced fertilization and regular monitoring."

},


"Tomato___Late_blight":{

description:"Late Blight spreads rapidly during cool and humid weather.",

symptoms:"Dark water-soaked lesions and white fungal growth.",

treatment:"Apply recommended fungicide immediately.",

prevention:"Maintain proper field sanitation."

},

"Tomato___healthy":{

description:"The plant is healthy and free from visible diseases.",

symptoms:"Fresh green leaves with no infection.",

treatment:"No treatment required.",

prevention:"Continue proper watering and nutrient management."

},

"Potato___Early_blight":{

description:"Common fungal disease affecting potato leaves.",

symptoms:"Brown concentric spots on leaves.",

treatment:"Use fungicide and remove infected foliage.",

prevention:"Crop rotation and healthy seed potatoes."

},

"Potato___Late_blight":{

description:"Serious fungal disease causing rapid crop loss.",

symptoms:"Dark lesions with white fungal growth.",

treatment:"Apply fungicide immediately.",

prevention:"Avoid excessive moisture."

},

"default":{

description:"Disease information is currently unavailable.",

symptoms:"No additional information available.",

treatment:"Consult an agricultural expert.",

prevention:"Maintain healthy farming practices."

}

};

// ==========================================
// HISTORY FUNCTIONS
// ==========================================

function saveHistory(item){

    let history=JSON.parse(localStorage.getItem("history")) || [];

    history.unshift(item);

    history=history.slice(0,5);

    localStorage.setItem("history",JSON.stringify(history));

}

function updateHistoryCard(){

    const history = JSON.parse(localStorage.getItem("history")) || [];

    historyList.innerHTML = "";

    if(history.length===0){

        historyList.innerHTML =
        `<li>No predictions yet.</li>`;

        return;

    }

    history.forEach((item,index)=>{

        historyList.innerHTML += `
        <li>
            <strong>${index+1}.</strong>
            🌿 ${item}
        </li>
        `;

    });

}

// ==========================================
// PREDICT BUTTON
// ==========================================

predictBtn.addEventListener("click", async () => {

    const file = imageInput.files[0];

    if (!file) {

        showToast("⚠ Please select an image first.");

        return;

    }

    startTime = performance.now();

    loading.style.display = "block";

    resultCard.style.display = "none";

    predictBtn.disabled = true;

    predictBtn.innerHTML =
        `<i class="fa-solid fa-spinner fa-spin"></i> Predicting...`;

    const formData = new FormData();

    formData.append("file", file);

    try {

        const response = await fetch("http://127.0.0.1:8000/predict", {

            method: "POST",

            body: formData

        });

        if (!response.ok) {

            throw new Error("Prediction Failed");

        }

        const data = await response.json();

        if (data.error) {

            throw new Error(data.error);

        }

        loading.style.display = "none";

        resultCard.style.display = "block";

        resultCard.classList.add("fade");

        predictBtn.disabled = false;

        predictBtn.innerHTML =
            `<i class="fa-solid fa-magnifying-glass"></i> Predict Disease`;

        // =====================================
        // PREDICTION
        // =====================================

        prediction.innerHTML = data.prediction;

        updateDiseaseInfo(data.prediction);

        // =====================================
        // CONFIDENCE
        // =====================================

        let percent = data.confidence;

        if (percent <= 1) {

            percent *= 100;

        }

        percent = Number(percent.toFixed(2));

        confidence.innerHTML = percent + "%";

        progressBar.style.width = percent + "%";

        progressBar.classList.remove("low", "medium", "high");

        if (percent >= 90) {

            progressBar.classList.add("high");

            prediction.style.color = "#16a34a";

        }

        else if (percent >= 70) {

            progressBar.classList.add("medium");

            prediction.style.color = "#eab308";

        }

        else {

            progressBar.classList.add("low");

            prediction.style.color = "#ef4444";

        }

        // =====================================
        // PREDICTION TIME
        // =====================================

        const endTime = performance.now();

        predictionTime.innerHTML =
            ((endTime - startTime) / 1000).toFixed(2) + " sec";

        // =====================================
        // SAVE HISTORY
        // =====================================

        saveHistory(data.prediction);

        updateHistoryCard();

        showToast("✅ Prediction Completed");

    }

    catch (err) {

        console.error(err);

        loading.style.display = "none";

        predictBtn.disabled = false;

        predictBtn.innerHTML =
            `<i class="fa-solid fa-magnifying-glass"></i> Predict Disease`;

        showToast("❌ Backend not connected.");

    }

});

// ==========================================
// UPDATE DISEASE INFORMATION
// ==========================================

function updateDiseaseInfo(diseaseName){

    const info = diseaseInfo[diseaseName] || diseaseInfo["default"];

    description.innerHTML = info.description;
    symptoms.innerHTML = info.symptoms;
    treatment.innerHTML = info.treatment;
    prevention.innerHTML = info.prevention;

}

// ==========================================
// CLEAR HISTORY
// ==========================================

function clearHistory(){

    localStorage.removeItem("history");

    updateHistoryCard();

    showToast("🗑 History Cleared");

}

// ==========================================
// RESET RESULT
// ==========================================

function resetResult(){

    resultCard.style.display="none";

    previewImage.src="";

    previewImage.style.display="none";

    imageInput.value="";

}

// ==========================================
// COPY PREDICTION
// ==========================================

function copyPrediction(){

    navigator.clipboard.writeText(prediction.innerText);

    showToast("📋 Prediction Copied");

}

// ==========================================
// DOWNLOAD RESULT
// ==========================================

function downloadResult(){

    const text =

`Crop Disease Prediction

Prediction : ${prediction.innerText}

Confidence : ${confidence.innerText}

Description :
${description.innerText}

Symptoms :
${symptoms.innerText}

Treatment :
${treatment.innerText}

Prevention :
${prevention.innerText}

Prediction Time :
${predictionTime.innerText}
`;

    const blob = new Blob([text],{

        type:"text/plain"

    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href=url;

    a.download="Prediction_Result.txt";

    a.click();

    URL.revokeObjectURL(url);

    showToast("⬇ Report Downloaded");

}

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================

document.addEventListener("keydown",(e)=>{

    if(e.key==="Escape"){

        resetResult();

    }

});

// ==========================================
// INITIAL LOAD
// ==========================================

updateHistoryCard();

showToast("🌱 Crop Disease Prediction System Ready");
