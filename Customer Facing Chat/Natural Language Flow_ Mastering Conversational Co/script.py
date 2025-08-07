# Creating comprehensive natural language flow patterns for formal menswear brand conversations
import json

# Natural conversation patterns and transition phrases for menswear
conversation_patterns = {
    "greeting_and_discovery": {
        "opening_patterns": [
            "Hi there! Looking for something special today?",
            "Welcome! What brings you in today?", 
            "Good afternoon! How can I help you look your best?",
            "Hello! Are you shopping for a particular occasion?"
        ],
        "discovery_transitions": [
            "Tell me more about...",
            "That sounds like...",
            "Perfect! Let me help you find...",
            "I can definitely help with that. What were you thinking in terms of...",
            "Great choice! Now, for an event like that, you'll want to consider..."
        ],
        "context_gathering": [
            "What's the occasion?",
            "When is the event?",
            "What time of day?",
            "Indoor or outdoor?",
            "How formal is the dress code?",
            "Any specific colors you prefer or want to avoid?"
        ]
    },
    
    "needs_assessment": {
        "lifestyle_questions": [
            "Do you wear suits regularly for work?",
            "Is this your first suit?",
            "What's your biggest concern when it comes to suits?",
            "How important is comfort versus traditional styling?",
            "Are you looking for something you can wear multiple ways?"
        ],
        "budget_transitions": [
            "What investment level were you considering?",
            "I have options in several price ranges - what works for your budget?",
            "Let's start by understanding what you'd like to invest...",
            "I can show you some great options starting at..."
        ],
        "sizing_approach": [
            "Have you been fitted for a suit before?",
            "Any particular fit challenges you've had in the past?",
            "Are you athletic build? Broader shoulders?",
            "Do you prefer a slimmer or more relaxed fit?",
            "Let's talk about how you like your clothes to fit..."
        ]
    },
    
    "product_presentation": {
        "introducing_options": [
            "Based on what you've told me, I think you'd love...",
            "Let me show you a few options that would work perfectly for...",
            "Here's what I'm thinking for your occasion...",
            "I've got some great pieces that would be ideal for..."
        ],
        "feature_explanations": [
            "This fabric is perfect because...",
            "The cut of this suit works really well for...",
            "What makes this special is...",
            "You'll love this detail - it...",
            "The construction here ensures that..."
        ],
        "comparison_phrases": [
            "Now, the difference between these two is...",
            "This one gives you more versatility because...",
            "If you're looking for something more traditional, this...",
            "For your specific needs, I'd lean toward this one because...",
            "Both are excellent, but for your occasion..."
        ]
    },
    
    "addressing_concerns": {
        "price_objections": [
            "I understand the investment is significant. Let me show you the value...",
            "When you consider cost per wear...",
            "This is built to last, and here's why that matters...",
            "Think of it this way - you'll have this for years...",
            "Let me show you some options that might work better for your budget..."
        ],
        "fit_concerns": [
            "Don't worry about the fit right now - that's what alterations are for",
            "I can see exactly what needs to be adjusted",
            "The beauty of this process is we make it perfect for you",
            "Let me explain how we'll tailor this to your body...",
            "Once we adjust this, you'll see exactly how it should look"
        ],
        "style_uncertainty": [
            "Trust me on this - it's going to look great on you",
            "I know it might feel different, but here's why it works...",
            "Let me show you how to style this...",
            "Once you see the full look together...",
            "This is going to give you exactly the look you want for..."
        ]
    },
    
    "decision_support": {
        "encouraging_phrases": [
            "You look fantastic in this",
            "This is exactly what you need for...",
            "I can tell you feel confident in this one",
            "This suit was made for you",
            "You're going to get so many compliments"
        ],
        "practical_reinforcement": [
            "This will work perfectly for your event",
            "You'll be able to wear this for years",
            "The versatility of this piece is incredible",
            "This hits all your requirements...",
            "For your lifestyle, this is ideal because..."
        ],
        "next_steps": [
            "Shall we get you measured for alterations?",
            "Let's talk about shirts and accessories",
            "When do you need this completed by?",
            "What questions do you still have?",
            "Ready to make this yours?"
        ]
    },
    
    "complementary_selling": {
        "natural_additions": [
            "Now that we have your suit sorted, let's think about...",
            "To complete this look, you'll want...",
            "Have you thought about what shirt you'll wear with this?",
            "Let me show you some accessories that would be perfect...",
            "While we're at it, let's make sure you have everything you need..."
        ],
        "value_additions": [
            "Since you're investing in quality, it makes sense to...",
            "To protect this investment, I'd recommend...",
            "These pieces work so well together...",
            "You'll want to have options for different occasions...",
            "This will give you a complete wardrobe solution..."
        ]
    },
    
    "closing_and_follow_up": {
        "completion_phrases": [
            "Perfect! Let's get everything organized for you",
            "Excellent choice - you're going to love wearing this",
            "I'm so excited to see how this turns out for you",
            "This is going to be perfect for your event",
            "You've made a great decision"
        ],
        "care_instructions": [
            "Let me tell you how to care for this...",
            "Here's what you need to know about maintenance...",
            "To keep this looking its best...",
            "I'll give you some care tips...",
            "This will last you years if you..."
        ],
        "follow_up_commitment": [
            "I'll call you when it's ready",
            "Feel free to reach out if you have any questions",
            "We're here if you need anything else",
            "Can't wait to see you in your finished suit",
            "Remember, we offer lifetime support on this piece"
        ]
    }
}

# Topic transitions for seamless conversation flow
topic_transitions = {
    "occasion_to_style": [
        "For that type of event, let's talk about style options...",
        "Perfect! Now, given the formality level, I'm thinking...",
        "That tells me exactly what direction we should go...",
        "Knowing that, here's what I'd recommend for style..."
    ],
    
    "style_to_fit": [
        "Now let's make sure this fits you perfectly...",
        "Great choice! Let's talk about how you like your suits to fit...",
        "Perfect style selection. Now for the most important part - the fit...",
        "I love that choice. Let's get the proportions just right for you..."
    ],
    
    "fit_to_fabric": [
        "Now that we know your fit preferences, let's discuss fabrics...",
        "Perfect fit! Now, what fabric weight are you thinking?",
        "Excellent. For your build and preferences, these fabrics would work well...",
        "Great! Now let's choose a fabric that complements this fit..."
    ],
    
    "fabric_to_color": [
        "This fabric comes in several beautiful colors...",
        "Now for the fun part - color selection...",
        "Given your skin tone and the occasion, here are some great color options...",
        "Perfect fabric choice! Let's find the right color for you..."
    ],
    
    "main_to_accessories": [
        "Now let's complete this look with the right accessories...",
        "Perfect! Now what shirt were you thinking?",
        "Great suit choice! Let's make sure you have everything you need...",
        "Beautiful selection! Now let's talk about finishing touches..."
    ],
    
    "product_to_service": [
        "And of course, we'll handle all the alterations...",
        "Part of our service includes making this perfect for you...",
        "We'll take care of all the tailoring to make this fit perfectly...",
        "Our master tailor will ensure this looks like it was made for you..."
    ]
}

# Common conversation obstacles and redirects
conversation_redirects = {
    "price_shock": {
        "acknowledgment": "I understand that's a significant investment",
        "reframe": "Let me help you think about this differently...",
        "value_pivot": "When you consider what you're getting...",
        "alternative_offer": "Let me show you some other options that might work better..."
    },
    
    "overwhelm": {
        "simplify": "I know there are a lot of choices. Let me simplify this for you...",
        "focus": "Let's focus on what's most important for your needs...",
        "guide": "Don't worry about all the details - I'll guide you through this...",
        "prioritize": "Let's start with the basics and build from there..."
    },
    
    "uncertainty": {
        "reassure": "That's completely normal - choosing a suit is a big decision",
        "educate": "Let me explain why this works so well for you...",
        "validate": "You're asking all the right questions",
        "trust_build": "I've helped hundreds of customers with exactly this situation..."
    },
    
    "time_pressure": {
        "urgency_handle": "No problem - we can definitely work with your timeline",
        "prioritize_needs": "Let's focus on getting you exactly what you need quickly",
        "rush_service": "We offer expedited service for situations like this",
        "essential_focus": "Let's make sure we get the essentials perfect first..."
    }
}

# Digital conversation adaptations (for chatbots/online)
digital_adaptations = {
    "typing_indicators": [
        "Let me find some options for you...",
        "One moment while I pull up your recommendations...",
        "Searching our inventory for perfect matches...",
        "Let me check availability in your size..."
    ],
    
    "clarification_requests": [
        "Just to make sure I understand - you're looking for...",
        "Quick question to help me find the best options...",
        "To narrow this down, can you tell me...",
        "Help me get this right - what's most important to you?"
    ],
    
    "visual_cues": [
        "Take a look at these options I've found for you",
        "Here's what I'm thinking based on your needs",
        "These would all work great for your occasion",
        "Let me show you what I mean..."
    ],
    
    "engagement_maintenance": [
        "What do you think of these options?",
        "Which of these speaks to you?",
        "Any questions about what you're seeing?",
        "Ready to dig deeper into any of these?"
    ]
}

# Cultural and demographic adaptations
demographic_patterns = {
    "younger_customers": {
        "language_style": "More casual, trendy references",
        "concerns": "Price, versatility, modern fit",
        "motivators": "Style, Instagram-worthy, value",
        "transitions": [
            "This is going to look fire on you",
            "Perfect for your vibe",
            "Super versatile - you can style this so many ways",
            "This has that modern cut you're looking for"
        ]
    },
    
    "professional_customers": {
        "language_style": "Efficient, benefit-focused",
        "concerns": "Quality, durability, professional appearance",
        "motivators": "Investment value, career advancement, time-saving",
        "transitions": [
            "This will serve you well in professional settings",
            "A solid investment for your career wardrobe",
            "The quality here ensures longevity",
            "This projects exactly the right level of authority"
        ]
    },
    
    "special_occasion": {
        "language_style": "Excited, celebratory",
        "concerns": "Looking perfect, memorable photos, fitting in",
        "motivators": "Standing out, feeling confident, making memories",
        "transitions": [
            "You're going to look amazing for this special day",
            "This is going to photograph beautifully",
            "Perfect for creating those memorable moments",
            "You'll feel so confident wearing this"
        ]
    }
}

# Compile all conversation intelligence
conversation_intelligence = {
    "conversation_patterns": conversation_patterns,
    "topic_transitions": topic_transitions,
    "conversation_redirects": conversation_redirects,
    "digital_adaptations": digital_adaptations,
    "demographic_patterns": demographic_patterns,
    "key_principles": {
        "active_listening": "Always acknowledge what the customer has said before moving to the next topic",
        "needs_focus": "Every transition should connect back to their stated needs",
        "confidence_building": "Regularly reassure and validate their choices",
        "natural_progression": "Flow should feel organic, not scripted",
        "outcome_orientation": "Every conversation should move toward a successful outcome"
    }
}

# Save conversation intelligence data
with open('menswear_conversation_intelligence.json', 'w') as f:
    json.dump(conversation_intelligence, f, indent=2)

print("Menswear Conversation Intelligence Compiled")
print("\nKey Components:")
print("1. Greeting and Discovery patterns for opening conversations")
print("2. Needs Assessment transitions for understanding requirements") 
print("3. Product Presentation flows for showcasing options")
print("4. Objection handling and concern addressing")
print("5. Decision support and closing techniques")
print("6. Topic transitions for seamless conversation flow")
print("7. Digital adaptations for online/chatbot interactions")
print("8. Demographic-specific language patterns")
print("9. Conversation redirects for common obstacles")
print("10. Natural language phrases that feel authentic and helpful")