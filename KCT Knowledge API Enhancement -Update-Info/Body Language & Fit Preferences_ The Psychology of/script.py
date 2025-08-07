# Creating comprehensive data on body language, fit preferences, and personality/age correlations
import json
import pandas as pd

# Professional suit fit preferences data
professional_fits = {
    "Lawyers": {
        "preferred_cut": "Single-breasted, two-button",
        "fit_style": "Classic conservative fit",
        "jacket_features": ["Notched lapels", "Medium shoulder padding", "Proper length covering seat"],
        "trouser_style": ["Flat front or pleated", "Moderate break", "Classic rise"],
        "colors": ["Navy blue", "Charcoal gray", "Dark brown"],
        "avoid": ["Black suits (except funerals)", "Bright colors", "Double-breasted (junior level)"],
        "body_language_signals": ["Authority", "Trustworthiness", "Conservative professionalism"],
        "key_principle": "Understated dignity over fashion-forward"
    },
    "Investment_Bankers": {
        "preferred_cut": "Slim to modern fit",
        "fit_style": "Tailored, sharp silhouette",
        "jacket_features": ["Peak or notched lapels", "Minimal shoulder padding", "Fitted through waist"],
        "trouser_style": ["Flat front", "No break or slight break", "Mid to low rise"],
        "colors": ["Navy", "Charcoal", "Dark gray"],
        "avoid": ["Overly casual styling", "Wide lapels", "Baggy fits"],
        "body_language_signals": ["Success", "Precision", "Modern professionalism"],
        "key_principle": "Sharp, expensive appearance signals competence"
    },
    "Consultants": {
        "preferred_cut": "Modern fit with flexibility",
        "fit_style": "Professional but adaptable",
        "jacket_features": ["Versatile lapel styles", "Comfortable shoulder", "Travel-friendly fabrics"],
        "trouser_style": ["Flat front preferred", "Slight break", "Comfortable rise"],
        "colors": ["Navy", "Gray variations", "Subtle patterns"],
        "avoid": ["Overly rigid styling", "High-maintenance fabrics"],
        "body_language_signals": ["Adaptability", "Intelligence", "Client service orientation"],
        "key_principle": "Professional versatility across client environments"
    },
    "Creative_Industries": {
        "preferred_cut": "Relaxed to slim fit",
        "fit_style": "Expressive and individual",
        "jacket_features": ["Varied lapel styles", "Unstructured options", "Interesting textures"],
        "trouser_style": ["Various rises", "Personal preference on break", "Creative fits"],
        "colors": ["Full spectrum", "Bold patterns", "Unique textures"],
        "avoid": ["Overly conservative styling", "Rigid dress codes"],
        "body_language_signals": ["Creativity", "Individuality", "Innovation"],
        "key_principle": "Personal expression within professional context"
    }
}

# Myers-Briggs personality type fit preferences
mbti_preferences = {
    "ENTJs_INTJs": {
        "style_philosophy": "Strategic professional appearance",
        "fit_preference": "Sharp, well-tailored fits",
        "key_characteristics": ["Minimalist wardrobe", "Quality over quantity", "Goal-oriented dressing"],
        "suit_style": "Classic business suits in navy and charcoal",
        "body_language": "Projects authority and competence"
    },
    "ENFJs_INFJs": {
        "style_philosophy": "Romantic but appropriate",
        "fit_preference": "Classic fits with meaningful accents",
        "key_characteristics": ["Timeless styles", "Personal significance", "Comfort at home"],
        "suit_style": "Traditional cuts with unique accessories",
        "body_language": "Approachable yet sophisticated"
    },
    "ENTPs_INTPs": {
        "style_philosophy": "Rational and comfortable",
        "fit_preference": "Loose-fitting, practical clothing",
        "key_characteristics": ["Comfort-first", "Witty elements", "Minimal effort"],
        "suit_style": "Comfortable fits, worn strategically",
        "body_language": "Intellectual casual confidence"
    },
    "ESFJs_ISFJs": {
        "style_philosophy": "Classic and comfortable",
        "fit_preference": "Time-tested, dependable fits",
        "key_characteristics": ["Investment pieces", "Coordinated looks", "Quality accessories"],
        "suit_style": "Traditional business attire",
        "body_language": "Reliable and put-together"
    },
    "ESTJs_ISTJs": {
        "style_philosophy": "Functional and effective",
        "fit_preference": "Proper fit for the occasion",
        "key_characteristics": ["Mix-and-match wardrobe", "Professional appearance", "Quality basics"],
        "suit_style": "Standard business cuts",
        "body_language": "Competent and prepared"
    },
    "ESFPs_ISFPs": {
        "style_philosophy": "Effortlessly stylish individual",
        "fit_preference": "Comfortable but perfectly coordinated",
        "key_characteristics": ["Meaningful pieces", "Aesthetic harmony", "Personal expression"],
        "suit_style": "Tailored with personal touches",
        "body_language": "Confident individuality"
    },
    "ESTPs_ISTPs": {
        "style_philosophy": "Practical comfort",
        "fit_preference": "Breathable, loose-fitting",
        "key_characteristics": ["Athletic influence", "High-quality basics", "Movement-friendly"],
        "suit_style": "Most breathable professional option",
        "body_language": "Active confidence"
    },
    "ENFPs_INFPs": {
        "style_philosophy": "Individual expression",
        "fit_preference": "Unique and personally meaningful",
        "key_characteristics": ["Highly personal", "Unconventional", "Value-driven choices"],
        "suit_style": "Non-traditional or creatively styled",
        "body_language": "Authentic self-expression"
    }
}

# Age-related suit preferences
age_preferences = {
    "Young_Men_18_29": {
        "preferred_silhouette": "Slim to modern fit",
        "key_features": ["Narrower lapels", "Fitted through body", "Contemporary styling"],
        "colors": ["Navy", "Charcoal", "Modern blues"],
        "avoid": ["Overly mature styling", "Wide lapels", "Conservative patterns"],
        "body_changes": "Athletic builds, establishing professional identity",
        "confidence_level": "Building professional presence"
    },
    "Professional_Men_30_54": {
        "preferred_silhouette": "Modern to classic fit",
        "key_features": ["Balanced proportions", "Quality construction", "Versatile styling"],
        "colors": ["Full professional spectrum", "Confident pattern use", "Individual expression"],
        "avoid": ["Trendy extremes", "Youth-oriented cuts"],
        "body_changes": "Peak professional years, maintaining fitness",
        "confidence_level": "Established professional confidence"
    },
    "Mature_Men_55_Plus": {
        "preferred_silhouette": "Classic to relaxed fit",
        "key_features": ["Comfortable proportions", "Quality fabrics", "Generous cuts"],
        "colors": ["Softer tones", "Reduced contrast", "Sophisticated patterns"],
        "avoid": ["Slim fits", "High contrast combinations", "Youth trends"],
        "body_changes": "Changing proportions, comfort priority",
        "confidence_level": "Mature style confidence, less trend-focused"
    }
}

# Generational differences in 2025
generational_trends_2025 = {
    "Gen_Z_Men": {
        "suit_preferences": ["Oversized fits", "Experimental styling", "Sustainable options"],
        "influences": ["Social media trends", "Gender-fluid fashion", "Streetwear integration"],
        "fit_philosophy": "Comfort and self-expression over tradition"
    },
    "Millennial_Men": {
        "suit_preferences": ["Slim to modern fits", "Quality investment pieces", "Customization"],
        "influences": ["Minimalism", "Tech integration", "Individual brand building"],
        "fit_philosophy": "Professional advancement through appearance"
    },
    "Gen_X_Men": {
        "suit_preferences": ["Classic tailoring", "Luxury fabrics", "Heritage brands"],
        "influences": ["Traditional menswear", "Status symbols", "Quality over trends"],
        "fit_philosophy": "Timeless elegance and status signaling"
    },
    "Baby_Boomers": {
        "suit_preferences": ["Comfortable classic fits", "Traditional styling", "Established brands"],
        "influences": ["Lifetime experience", "Comfort priority", "Established taste"],
        "fit_philosophy": "Dignity and comfort over fashion"
    }
}

# Save all data
comprehensive_data = {
    "professional_preferences": professional_fits,
    "personality_preferences": mbti_preferences,
    "age_preferences": age_preferences,
    "generational_trends_2025": generational_trends_2025
}

with open('body_language_fit_preferences.json', 'w') as f:
    json.dump(comprehensive_data, f, indent=2)

print("Body Language & Fit Preferences Data Compiled")
print("\nKey Research Findings:")
print("1. Professional differences are significant - lawyers prefer conservative cuts, bankers favor sharp tailoring")
print("2. MBTI types show distinct patterns - NTs prefer functional, SFs prefer comfortable-classic")
print("3. Age strongly correlates with fit preferences - young men prefer slim, older men prefer comfort")
print("4. 2025 generational trends show clear divergence in suit philosophy")
print("5. Body language signals vary dramatically by profession and personality type")