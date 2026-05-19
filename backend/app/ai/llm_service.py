import google.generativeai as genai
from app.core.config import settings

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)

FLASH_MODEL = 'gemini-2.5-flash-preview-05-20'
PRO_MODEL = 'gemini-2.5-flash-preview-05-20'

def get_flash_model():
    return genai.GenerativeModel(FLASH_MODEL)

def get_pro_model():
    return genai.GenerativeModel(PRO_MODEL)

async def draft_parent_update(kid_name: str, activity_tags: str) -> str:
    """
    Drafts a warm, parent-friendly update message based on quick tags from the teacher.
    """
    prompt = f"""
    You are an AI assistant helping a daycare teacher write updates for parents.
    Write a short, warm, and professional 1-2 sentence update for a parent about their child, {kid_name}.
    Use the following activity tags to form the update: {activity_tags}
    
    Make it sound human, encouraging, and natural. Do not use emojis unless appropriate.
    """
    model = get_flash_model()
    response = model.generate_content(prompt)
    return response.text.strip()

async def summarize_photo(image_path: str, kid_name: str) -> str:
    """
    Uses Gemini Vision to analyze a photo and return a short description of the activity.
    """
    # Note: In a real implementation, you would upload the file to Gemini using genai.upload_file
    # or pass a Pillow Image object. We'll assume a Pillow image for the API.
    import PIL.Image
    try:
        img = PIL.Image.open(image_path)
    except Exception as e:
        return f"Could not process photo: {str(e)}"

    prompt = f"Briefly describe what the child ({kid_name}) is doing in this photo. Keep it to 1 sentence suitable for a daycare update."
    model = get_flash_model()
    response = model.generate_content([prompt, img])
    return response.text.strip()

async def generate_daily_summary(kid_name: str, updates_text: list[str]) -> str:
    """
    Aggregates a list of daily updates and writes a cohesive end-of-day summary.
    """
    updates_combined = "\n- ".join(updates_text)
    prompt = f"""
    You are an AI assistant helping a daycare center generate daily summaries.
    Write a cohesive, warm paragraph summarizing {kid_name}'s day based on these logged updates:
    
    - {updates_combined}
    
    The summary should flow well and give the parent a good overview of their child's day.
    """
    model = get_flash_model() # Flash is usually good enough, but could use Pro if needed
    response = model.generate_content(prompt)
    return response.text.strip()
