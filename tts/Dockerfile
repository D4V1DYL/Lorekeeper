# Server suara Piper (gratis, offline, jalan di CPU). Opsional: aktifkan dengan profil "voice".
#   docker compose --profile voice up -d --build
# Suara di-unduh sekali saat build dari Hugging Face (rhasspy/piper-voices).
FROM python:3.12-slim
ENV PIP_NO_CACHE_DIR=1 PYTHONUNBUFFERED=1
RUN pip install "piper-tts[http]"
ARG VOICES="id_ID-news_tts-medium en_US-ryan-medium"
RUN mkdir -p /voices && python3 -m piper.download_voices --data-dir /voices ${VOICES}
WORKDIR /voices
EXPOSE 5000
# -m = suara default; field "voice" pada request memilih suara lain dari /voices
CMD ["python3", "-m", "piper.http_server", "--host", "0.0.0.0", "--port", "5000", "--data-dir", "/voices", "-m", "en_US-ryan-medium"]
