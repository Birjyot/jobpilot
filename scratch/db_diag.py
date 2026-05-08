from dotenv import load_dotenv
load_dotenv()
import os
from sqlalchemy import create_engine, text

engine = create_engine(os.environ['DATABASE_URL'])
with engine.connect() as conn:
    print('Table Row Counts:')
    for t in ['"user"', 'job_application', 'ai_cache', 'short_links']:
        res = conn.execute(text(f"SELECT COUNT(*) FROM {t}"))
        count = res.scalar()
        print(f'  - {t}: {count}')
    
    print('\nSample User Emails:')
    res = conn.execute(text("SELECT email FROM \"user\" LIMIT 10"))
    for row in res:
        print(f'  - {row[0]}')

    print('\nSample Job Application User IDs:')
    res = conn.execute(text("SELECT DISTINCT user_id FROM job_application LIMIT 10"))
    for row in res:
        print(f'  - {row[0]}')
