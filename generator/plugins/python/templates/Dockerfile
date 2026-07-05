# syntax=docker/dockerfile:1
# Self-contained — no Python needed on the host (Laws 19-21).
FROM python:__PYTHON_VERSION__-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
