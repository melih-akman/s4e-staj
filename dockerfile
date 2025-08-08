FROM python:3.11

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

COPY . .

# Varsayılan olarak flask çalışsın, worker için override edeceğiz
CMD ["flask", "run", "--host=0.0.0.0"]