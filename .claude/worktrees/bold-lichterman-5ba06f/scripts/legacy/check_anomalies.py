import sqlite3

def check():
    conn = sqlite3.connect('transparencia_rj.db')
    c = conn.cursor()
    
    c.execute("SELECT COUNT(*) FROM emendas")
    total = c.fetchone()[0]
    
    # Valors that were multiplied by 10000 will be >= 10000 and have NO cents/units 
    # (i.e. valor % 10000 == 0).
    # Since the hack applied to 0 < valor < 10000, the corrupted values are all between 0 and 100000000.
    c.execute("SELECT COUNT(*) FROM emendas WHERE valor > 0 AND valor % 10000 = 0 AND valor < 100000000")
    suspect = c.fetchone()[0]
    
    print(f"Total de emendas: {total}")
    print(f"Emendas suspeitas (multiplicadas por 10000): {suspect}")
    
    conn.close()

if __name__ == '__main__':
    check()
