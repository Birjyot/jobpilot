import random
from datetime import datetime, timedelta
from app import app, db
from models import User, JobApplication

# This script populates your Supabase DB with test data.
# Claude can generate a much larger version of this list for you!

USERS_DATA = [
    {"name": "Alex River", "email": "alex.river@example.com"},
    {"name": "Sam Smith", "email": "sam.smith@tech.io"},
    {"name": "Jordan Lee", "email": "jlee@dev.com"},
    # ... Claude will help you expand this to 80 users
]

COMPANIES = ["Google", "Meta", "Amazon", "Netflix", "Microsoft", "Stripe", "Airbnb", "Uber", "Coinbase", "OpenAI"]
POSITIONS = ["Software Engineer", "Frontend Developer", "Backend Engineer", "Full Stack Developer", "Data Scientist", "Product Manager"]
LOCATIONS = ["Remote", "New York, NY", "San Francisco, CA", "Austin, TX", "London, UK", "Bangalore, IN"]
STATUSES = ["Applied", "Applied", "Applied", "Screening", "Interview", "Offer", "Rejected"]
PLATFORMS = ["LinkedIn", "Indeed", "Glassdoor", "Company Website", "Referral", "Gmail Sync"]

def seed_database():
    with app.app_context():
        print("Starting database seeding...")
        
        # Clear existing data if you want a fresh start (Optional)
        # db.session.query(JobApplication).delete()
        # db.session.query(User).delete()

        for user_info in USERS_DATA:
            # 1. Create User
            user = User.query.filter_by(email=user_info['email']).first()
            if not user:
                user = User(name=user_info['name'], email=user_info['email'])
                db.session.add(user)
            
            # 2. Create 3-10 random jobs for this user
            num_jobs = random.randint(3, 10)
            for _ in range(num_jobs):
                applied_days_ago = random.randint(0, 180)
                applied_date = datetime.utcnow() - timedelta(days=applied_days_ago)
                
                job = JobApplication(
                    user_id=user.email,
                    company=random.choice(COMPANIES),
                    position=random.choice(POSITIONS),
                    location=random.choice(LOCATIONS),
                    status=random.choice(STATUSES),
                    platform=random.choice(PLATFORMS),
                    applied_date=applied_date,
                    notes="Automated test data for analytics verification.",
                    salary_range=f"${random.randint(80, 160)}k - ${random.randint(170, 250)}k"
                )
                db.session.add(job)
        
        db.session.commit()
        print(f"Successfully seeded {len(USERS_DATA)} users and their applications into Supabase!")

if __name__ == "__main__":
    seed_database()
