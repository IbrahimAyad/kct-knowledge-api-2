# Creating comprehensive analysis of untapped markets in menswear suits
import json
import pandas as pd

# Barriers preventing non-traditional customers from buying suits
suit_barriers = {
    "financial_barriers": {
        "high_cost": {
            "description": "Suits perceived as expensive luxury items",
            "impact": "44% of Americans never wear suits",
            "evidence": "Price point beyond reach for many demographics",
            "solution_needed": "Affordable, quality options"
        },
        "value_perception": {
            "description": "Lack of understanding of suit value/ROI",
            "impact": "28% of men never wear owned suits",
            "evidence": "Suits seen as single-use rather than versatile",
            "solution_needed": "Education on versatility and cost-per-wear"
        }
    },
    "cultural_barriers": {
        "workplace_casualization": {
            "description": "Declining need for formal wear at work",
            "impact": "Only 7% of workers wear business attire",
            "evidence": "Dress codes relaxed across industries",
            "solution_needed": "Casual suit options, hybrid styles"
        },
        "generational_shift": {
            "description": "Younger consumers prefer comfort over formality",
            "impact": "Athleisure growth threatens traditional formal wear",
            "evidence": "Cultural shift toward casual lifestyle",
            "solution_needed": "Modern, comfortable formal wear"
        }
    },
    "practical_barriers": {
        "sizing_challenges": {
            "description": "62% struggle to find clothing that fits",
            "impact": "Standard sizing excludes many body types",
            "evidence": "Lack of size standardization",
            "solution_needed": "Better sizing, custom options"
        },
        "shopping_experience": {
            "description": "Intimidating, confusing suit shopping process",
            "impact": "Men avoid suit stores due to complexity",
            "evidence": "Bad retailing practices cited as major barrier",
            "solution_needed": "Simplified, educational shopping experience"
        }
    },
    "knowledge_barriers": {
        "lack_of_education": {
            "description": "Don't understand when/how to wear suits",
            "impact": "Fundamental lack of menswear knowledge",
            "evidence": "Men don't know they need suits for certain occasions",
            "solution_needed": "Educational content, styling guidance"
        },
        "fit_understanding": {
            "description": "Don't know how suits should fit",
            "impact": "Poor fit leads to dissatisfaction",
            "evidence": "Off-the-rack challenges for non-standard bodies",
            "solution_needed": "Fit education, alteration services"
        }
    }
}

# Underserved body types in menswear
body_type_gaps = {
    "plus_size_men": {
        "market_size": "Significant underrepresented demographic",
        "current_options": "Limited to Men's Warehouse, DXL, Big & Tall specialty stores",
        "challenges": [
            "Most manufacturers cater to out-of-shape men poorly",
            "Athletic men with larger builds have off-the-rack challenges",
            "Limited fashionable options in extended sizes"
        ],
        "opportunities": [
            "Custom/made-to-measure services",
            "Better proportioned sizing",
            "Fashion-forward plus-size options"
        ],
        "brands_serving": ["Men's Warehouse", "DXL", "Moss Bros Big & Tall", "Michael Strahan Collection"]
    },
    "athletic_builds": {
        "market_size": "Growing fitness-conscious demographic",
        "current_options": "Minimal specialized athletic-fit suits",
        "challenges": [
            "Standard suits too tight in chest/shoulders, too loose in waist",
            "Powerlifters and bodybuilders especially underserved",
            "Need larger seat drop measurements"
        ],
        "opportunities": [
            "Athletic-cut suits with proper proportions",
            "Stretch fabrics for comfort",
            "Specialized fitting for muscular builds"
        ]
    },
    "short_men": {
        "market_size": "Significant portion of male population",
        "current_options": "Limited short/petite men's options",
        "challenges": [
            "Standard proportions don't work for shorter frames",
            "Need shorter jacket lengths, proper trouser proportions",
            "Limited availability in shorter sizes"
        ],
        "opportunities": [
            "Specialized short men's lines",
            "Proper proportion adjustments",
            "Dedicated short men's retailers"
        ]
    },
    "tall_thin_men": {
        "market_size": "Rectangle body type demographic",
        "current_options": "Some tall sizes available but proportions often wrong",
        "challenges": [
            "Off-the-rack too short in arms/legs",
            "Need structured tailoring to create shape",
            "Limited tall and slim combinations"
        ],
        "opportunities": [
            "Extended tall sizes with proper proportions",
            "Structured tailoring for slim builds",
            "Tall specialty lines"
        ]
    },
    "mature_men": {
        "market_size": "Growing aging population",
        "current_options": "Traditional suits often uncomfortable for changing bodies",
        "challenges": [
            "Body changes with age require different fits",
            "Comfort becomes priority over fashion",
            "Limited age-appropriate styling"
        ],
        "opportunities": [
            "Comfort-focused formal wear",
            "Easy-care fabrics",
            "Age-appropriate modern styling"
        ]
    }
}

# Accessibility needs not being addressed
accessibility_gaps = {
    "physical_disabilities": {
        "wheelchair_users": {
            "market_size": "Millions of wheelchair users globally",
            "current_solutions": "Limited adaptive suit options",
            "specific_needs": [
                "Seated-fit proportions",
                "Shorter jacket lengths",
                "Accessible closures",
                "Comfortable seated wear"
            ],
            "brands_addressing": ["IZ Adaptive", "Kinetic Balance", "Silverts"],
            "gaps": "Very limited formal wear options, mostly casual adaptive wear"
        },
        "limited_mobility": {
            "market_size": "Significant aging and disabled population",
            "current_solutions": "Basic adaptive clothing, minimal formal wear",
            "specific_needs": [
                "Easy dressing features",
                "Magnetic closures",
                "Velcro fastenings",
                "Open-back designs for assisted dressing"
            ],
            "brands_addressing": ["MagnaReady", "Joe & Bella", "Buck & Buck"],
            "gaps": "Limited stylish, professional options"
        }
    },
    "sensory_disabilities": {
        "visual_impairments": {
            "market_size": "Millions with vision impairments",
            "current_solutions": "Minimal consideration in menswear",
            "specific_needs": [
                "Tactile fabric identification",
                "Easy color coordination",
                "Simple, consistent styling",
                "Clear care instructions"
            ],
            "gaps": "No specialized solutions for blind/visually impaired men"
        },
        "hearing_impairments": {
            "market_size": "Significant deaf/hard of hearing population",
            "current_solutions": "Standard menswear doesn't address needs",
            "specific_needs": [
                "Visual communication aids",
                "Clear fitting instructions",
                "Accessible shopping experiences"
            ],
            "gaps": "No consideration for deaf/hard of hearing customers"
        }
    },
    "cognitive_disabilities": {
        "autism_sensory_needs": {
            "market_size": "Growing diagnosed autism population",
            "current_solutions": "Some sensory-friendly clothing brands",
            "specific_needs": [
                "Soft, non-irritating fabrics",
                "Tagless designs",
                "Seamless construction",
                "Familiar textures"
            ],
            "brands_addressing": ["June Adaptive (limited menswear)"],
            "gaps": "Virtually no sensory-friendly formal menswear"
        },
        "dementia_alzheimers": {
            "market_size": "Growing aging population with cognitive decline",
            "current_solutions": "Basic adaptive clothing",
            "specific_needs": [
                "Simple dressing procedures",
                "Familiar, comfortable styling",
                "Easy-care fabrics",
                "Safety features"
            ],
            "gaps": "Limited dignified formal wear options"
        }
    },
    "temporary_disabilities": {
        "injury_recovery": {
            "market_size": "Anyone recovering from surgery or injury",
            "current_solutions": "Very limited temporary adaptive options",
            "specific_needs": [
                "Easy access for medical devices",
                "One-handed dressing capabilities",
                "Accommodation for casts/braces",
                "Professional appearance during recovery"
            ],
            "gaps": "No rental or temporary adaptive formal wear"
        }
    }
}

# Market opportunities and solutions
market_opportunities = {
    "size_inclusive_solutions": {
        "custom_technology": "AI-powered sizing and fit technology",
        "manufacturing": "On-demand production for extended sizes",
        "retail": "Inclusive shopping experiences and education"
    },
    "accessibility_solutions": {
        "adaptive_formal_wear": "Stylish suits with accessibility features",
        "sensory_friendly": "Formal wear for sensory sensitivities",
        "technology_integration": "Smart clothing with accessibility features"
    },
    "cultural_solutions": {
        "casual_formal_hybrid": "Comfortable formal wear for modern lifestyle",
        "education_programs": "Menswear education and styling services",
        "value_communication": "Cost-per-wear and versatility messaging"
    }
}

# Compile all data
untapped_markets_data = {
    "suit_purchase_barriers": suit_barriers,
    "underserved_body_types": body_type_gaps,
    "accessibility_gaps": accessibility_gaps,
    "market_opportunities": market_opportunities,
    "key_statistics": {
        "market_facts": [
            "44% of Americans never wear suits",
            "28% of men who own suits never wear them",
            "Only 7% of workers wear business attire",
            "62% struggle to find clothing that fits",
            "13% of US population has disabilities ($21B disposable income)",
            "Adaptive clothing market projected to reach $400B by 2026"
        ]
    }
}

# Save comprehensive data
with open('untapped_menswear_markets.json', 'w') as f:
    json.dump(untapped_markets_data, f, indent=2)

print("Untapped Menswear Markets Analysis Completed")
print("\nKey Findings:")
print("1. 44% of Americans never wear suits - massive untapped market")
print("2. Plus-size men severely underserved in fashionable formal wear")
print("3. Athletic builds need specialized proportions not available off-the-rack")
print("4. Accessibility needs largely ignored - $21B market with disabilities")
print("5. Sensory-friendly formal wear virtually non-existent")
print("6. Cultural barriers include workplace casualization and generational shifts")
print("7. Knowledge gaps prevent suit purchases - need education and guidance")
print("8. Shopping experience barriers deter customers from suit stores")