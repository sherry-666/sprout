from PIL import Image, ImageDraw, ImageFont
import io

def add_sticker(base_image_path: str, sticker_path: str, position: tuple = (0, 0)) -> bytes:
    """
    Composites a sticker (PNG with transparency) onto the base image.
    Returns the resulting image as bytes.
    """
    try:
        base_img = Image.open(base_image_path).convert("RGBA")
        sticker_img = Image.open(sticker_path).convert("RGBA")
        
        # Paste the sticker using its own alpha channel as the mask
        base_img.paste(sticker_img, position, sticker_img)
        
        # Convert back to RGB to save as JPEG if needed, or keep RGBA
        output_img = base_img.convert("RGB")
        
        img_byte_arr = io.BytesIO()
        output_img.save(img_byte_arr, format='JPEG')
        return img_byte_arr.getvalue()
    except Exception as e:
        print(f"Error adding sticker: {e}")
        return None

def add_caption(base_image_path: str, text: str, position: tuple = (50, 50)) -> bytes:
    """
    Adds a text caption overlay to the photo.
    """
    try:
        img = Image.open(base_image_path).convert("RGB")
        draw = ImageDraw.Draw(img)
        
        # In a real scenario, you'd load a TTF font file. 
        # Using default bitmap font here as a fallback.
        draw.text(position, text, fill=(255, 255, 255))
        
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG')
        return img_byte_arr.getvalue()
    except Exception as e:
        print(f"Error adding caption: {e}")
        return None
