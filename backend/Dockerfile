FROM python:3.11-slim

# Build deps for dlib/face_recognition and opencv
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-6 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install heavy native packages first (cached as a separate layer)
# dlib 19.24 ships binary wheels for Python 3.11 linux/amd64 — no compilation needed
RUN pip install --no-cache-dir \
    "dlib==19.24.6" \
    "face-recognition==1.3.0" \
    "opencv-python-headless>=4.9.0"

# Install remaining Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
