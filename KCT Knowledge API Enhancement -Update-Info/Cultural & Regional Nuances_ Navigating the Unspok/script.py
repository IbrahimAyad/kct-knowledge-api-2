# Creating comprehensive data on cultural and regional nuances
import json
import pandas as pd

# Religious ceremony dress codes
religious_dress_codes = {
    "Catholic_Church": {
        "general_principles": "Modest, conservative attire showing respect for Real Presence",
        "men": {
            "preferred": ["Dark suit with tie", "Collared dress shirt", "Clean dress pants", "Formal shoes"],
            "avoid": ["Shorts", "Tank tops", "Casual wear", "Hats inside church"],
            "colors": ["Dark colors preferred", "Navy", "Charcoal", "Black for formal occasions"]
        },
        "women": {
            "preferred": ["Dress or skirt covering knees", "Blouse covering shoulders", "Modest neckline"],
            "avoid": ["Short skirts", "Low necklines", "Sleeveless tops", "Revealing clothing"],
            "head_covering": "Optional but respectful (traditional)"
        },
        "unspoken_rules": ["No written dress code but strong expectations", "Best attire for God's presence", "Parable of wedding guest as reference"]
    },
    "Orthodox_Church": {
        "general_principles": "House of God requires finest, most modest clothing",
        "men": {
            "preferred": ["Collared button-up shirts", "Clean dress pants (no jeans)", "Sweaters or vests", "Ties and coats appropriate"],
            "avoid": ["Shorts even in summer", "Jeans", "Clothes with logos", "More than one button undone"],
            "colors": ["Conservative colors", "Avoid bright or flashy colors"]
        },
        "women": {
            "preferred": ["Long skirts or dresses", "Sleeves covering arms", "High necklines", "Head covering"],
            "avoid": ["Pants in some parishes", "Short sleeves", "Low necklines", "Tight clothing"],
            "head_covering": "Required or strongly encouraged"
        }
    },
    "Jewish_Synagogue": {
        "general_principles": "Respectful attire varying by Orthodox to Reform",
        "men": {
            "preferred": ["Suit or slacks with tie and jacket", "Kippah (yarmulke)", "Conservative business attire"],
            "avoid": ["Shorts", "Casual wear", "Tank tops"],
            "head_covering": "Kippah required for all men regardless of faith"
        },
        "women": {
            "preferred": ["Dress or formal pantsuit", "Knee-length or longer skirts", "Covered shoulders"],
            "avoid": ["Short skirts", "Sleeveless tops", "Overly casual attire"],
            "head_covering": "Optional hat or lace covering in some synagogues",
            "orthodox_requirements": "Very modest dress, possible hair covering"
        }
    },
    "Islamic_Mosque": {
        "general_principles": "Modest covering, shoes removed at entrance",
        "men": {
            "preferred": ["Long pants", "Long-sleeved shirts", "Clean socks (shoes removed)"],
            "avoid": ["Shorts", "Tank tops", "Tight clothing"],
            "colors": ["Modest colors", "Avoid bright or attention-grabbing patterns"]
        },
        "women": {
            "preferred": ["Long sleeves", "Long pants or ankle-length skirts", "Headscarf covering hair"],
            "avoid": ["Short sleeves", "Short skirts", "Tight clothing", "Low necklines"],
            "head_covering": "Required - headscarf covering hair completely"
        }
    },
    "Hindu_Temple": {
        "general_principles": "Similar to mosque rules, shoes removed, modest dress",
        "men": {
            "preferred": ["Long pants", "Covered torso", "Clean appearance"],
            "avoid": ["Shorts", "Tank tops", "Leather items in some temples"],
            "special": "Some temples require traditional dress"
        },
        "women": {
            "preferred": ["Long skirts or traditional dress", "Covered shoulders and arms", "Head covering optional but respectful"],
            "avoid": ["Short clothing", "Western revealing styles"],
            "restrictions": "May be prohibited during menstruation (traditional rule)"
        }
    },
    "Buddhist_Temple": {
        "general_principles": "Modest, respectful covering",
        "men": {
            "preferred": ["Pants past knee", "Shirts with sleeves", "No baseball caps"],
            "avoid": ["Shorts", "Sleeveless tops", "Casual headwear"]
        },
        "women": {
            "preferred": ["Covered legs", "Sleeves", "No midriff showing"],
            "avoid": ["Shorts", "Tank tops", "Revealing clothing"]
        }
    }
}

# Detroit suburbs style differences
detroit_style_map = {
    "Downtown_Detroit": {
        "style_profile": "Mix of business professional and urban streetwear",
        "characteristics": ["Sports team gear", "Athletic wear", "Business attire", "Detroit pride brands"],
        "brands": ["Detroit vs. Everybody", "Detroit Hustles Harder", "Carhartt", "Shinola"],
        "dress_code": "Varies from business casual to urban casual"
    },
    "Royal_Oak": {
        "style_profile": "Young professional 'fratty' aesthetic",
        "characteristics": ["Shiny express dress shirts", "Polo shirts", "Finance-influenced clothing", "Going-out attire"],
        "demographic": "Young professionals in finance and business",
        "dress_code": "Business casual to nightlife smart casual"
    },
    "Midtown_Detroit": {
        "style_profile": "Hipster and student influenced",
        "characteristics": ["Cut-off jeans", "Piercings", "Thrifted colorful clothing", "Rough streetwear"],
        "influences": ["Wayne State students", "Artist community", "Vintage finds"],
        "dress_code": "Creative casual, artistic expression"
    },
    "Suburbs_General": {
        "style_profile": "Middle class, mall brand focused",
        "characteristics": ["Mall brands", "Outdoor wear (LL Bean, Patagonia)", "Casual comfort"],
        "locations": ["Novi", "Rochester Hills", "Sterling Heights"],
        "dress_code": "Casual suburban, outdoor recreation ready"
    },
    "Ferndale": {
        "style_profile": "Upper middle class casual",
        "characteristics": ["College-influenced fashion", "Normcore for older residents"],
        "dress_code": "Smart casual, college-influenced"
    },
    "Ann_Arbor": {
        "style_profile": "College town with outdoor influence",
        "characteristics": ["University of Michigan gear", "North Face", "Patagonia", "Athletic wear", "Minimal streetwear"],
        "special_notes": ["Canada Goose ubiquitous in winter", "Outdoorsy aesthetic", "Student influence"],
        "dress_code": "Athletic casual, outdoor focused"
    },
    "Hamtramck": {
        "style_profile": "Diverse, family-run business aesthetic",
        "characteristics": ["Eclectic vintage", "Family business casual", "Multicultural influences"],
        "dress_code": "Casual, culturally diverse"
    },
    "Dearborn": {
        "style_profile": "Middle Eastern cultural influence",
        "characteristics": ["Cultural pride merchandise", "Local business support", "Traditional and modern mix"],
        "dress_code": "Culturally influenced casual to business"
    }
}

# Cultural color taboos
color_taboos = {
    "White": {
        "positive_meanings": ["Purity (Western)", "Weddings (Western)", "Peace", "Cleanliness"],
        "negative_meanings": ["Death and mourning (China, Japan, Korea, India)", "Bad luck (China)", "Emptiness (Japan)"],
        "religious_significance": ["Sacred in Shintoism", "Purity in Christianity", "Mourning in Buddhism"],
        "taboos": ["Avoid at Chinese celebrations", "Inappropriate for joyous occasions in Asia", "Can signify death in Eastern cultures"]
    },
    "Black": {
        "positive_meanings": ["Elegance (Western)", "Sophistication", "Power", "Formality"],
        "negative_meanings": ["Death and mourning (Universal)", "Evil (Thailand, Tibet)", "Negative energy"],
        "cultural_variations": ["Maturity and masculinity (Africa)", "Wealth and prosperity (China)", "National color (New Zealand)"],
        "taboos": ["Avoid at joyous celebrations in some cultures", "Associated with bad luck in certain contexts"]
    },
    "Red": {
        "positive_meanings": ["Good luck (China)", "Celebration (Asia)", "Love and passion (Western)", "Prosperity"],
        "negative_meanings": ["Death (some African cultures)", "Anger", "Danger (Western)", "Infidelity implications"],
        "religious_significance": ["Sacred in Hinduism", "Blood of Christ (Christianity)", "Fire and energy"],
        "taboos": ["Avoid wearing to others' weddings (can mean affair with groom)", "Funeral attendance restrictions", "May upstage bride"]
    },
    "Yellow": {
        "positive_meanings": ["Royalty (Asia)", "Happiness (Western)", "Sacred (Eastern cultures)", "Courage (Japan)"],
        "negative_meanings": ["Mourning (Latin America, Egypt)", "Envy (Germany)", "Cowardice"],
        "cultural_significance": ["Imperial color (China)", "Commerce (India)", "High status (Africa)"],
        "taboos": ["Mourning color in some cultures", "Can be associated with negative traits"]
    },
    "Green": {
        "positive_meanings": ["Nature", "Growth", "Islam (sacred)", "Luck (Ireland)", "Fertility"],
        "negative_meanings": ["Infidelity (China - green hat)", "Exorcism (Indonesia)", "Envy"],
        "religious_significance": ["Sacred in Islam", "Paradise (Quran)", "Eternal life (Japan)"],
        "taboos": ["Green hat taboo in China", "Negative connotations in some Southeast Asian cultures"]
    },
    "Purple": {
        "positive_meanings": ["Royalty", "Luxury", "Nobility", "Spirituality"],
        "negative_meanings": ["Death (Catholic Europe)", "Mourning (Thailand - widows)", "Prostitution (some Middle Eastern cultures)"],
        "religious_significance": ["Penance (Christianity)", "Lent and Advent", "Spiritual power"],
        "taboos": ["Avoid in Catholic mourning contexts", "Cultural sensitivity needed in Middle East"]
    },
    "Blue": {
        "positive_meanings": ["Trust (Western)", "Authority", "Calm", "Spirituality (Eastern)"],
        "negative_meanings": ["Mourning (Iran)", "Sadness", "Cold"],
        "cultural_variations": ["Immortality (China)", "Sacred (Hindu)", "Protection (Middle East)"],
        "taboos": ["Mourning associations in some cultures", "Cold/distant implications"]
    }
}

# Compile all data
comprehensive_cultural_data = {
    "religious_dress_codes": religious_dress_codes,
    "detroit_regional_styles": detroit_style_map,
    "cultural_color_taboos": color_taboos,
    "key_insights": {
        "religious_sensitivity": "Unspoken dress codes often more important than written ones",
        "regional_variations": "Detroit suburbs show distinct style tribes based on demographics",
        "color_cultural_sensitivity": "Same colors have opposite meanings across cultures",
        "universal_principle": "Modesty and respect transcend specific cultural rules"
    }
}

# Save comprehensive data
with open('cultural_regional_nuances.json', 'w') as f:
    json.dump(comprehensive_cultural_data, f, indent=2)

print("Cultural & Regional Nuances Data Compiled")
print("\nKey Findings:")
print("1. Religious dress codes rely heavily on unspoken cultural expectations")
print("2. Detroit suburbs have distinct style 'tribes' - from hipster Midtown to fratty Royal Oak")
print("3. Color taboos are severe - white means death in Asia, red can mean adultery at weddings")
print("4. Cultural sensitivity in color choice is crucial for international business")
print("5. Regional style differences within metro areas can be more significant than between cities")