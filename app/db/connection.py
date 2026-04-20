import mysql.connector

def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="sua_senha_aqui", #essa é a senha, eu sei que é ruim
        database="Destravar"
    )