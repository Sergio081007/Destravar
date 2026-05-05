import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # use a service_role key no backend

_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_connection() -> Client:
    return _client