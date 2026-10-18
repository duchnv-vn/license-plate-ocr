"""Warm model download/cache without ever reading real license plate images."""
from .services import engine

if __name__ == "__main__":
    engine.warm_up()
    print("Model weights cached successfully in the model-cache volume.")
