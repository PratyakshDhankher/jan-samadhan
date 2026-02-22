import pytesseract
from PIL import Image
import io

def extract_text(image_bytes: bytes, languages: str = "hin+eng+mar+tam") -> str:
    """
    Extracts text from image bytes using Tesseract OCR.
    Ensure 'tesseract-ocr' and relevant language packs are installed in the environment.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        # --oem 3: Default, --psm 6: Assume a single uniform block of text.
        text = pytesseract.image_to_string(image, lang=languages, config='--oem 3 --psm 6')
        return text
    except Exception as e:
        print(f"OCR Error: {e}")
        return ""
