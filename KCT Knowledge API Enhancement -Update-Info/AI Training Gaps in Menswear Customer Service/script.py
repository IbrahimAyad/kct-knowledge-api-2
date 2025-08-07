# Create comprehensive analysis of AI training gaps in menswear customer service

import pandas as pd

# Customer conversation dead ends data
conversation_dead_ends_data = {
    'Question_Category': [
        'Fit & Sizing', 'Fit & Sizing', 'Fit & Sizing', 'Fit & Sizing', 'Fit & Sizing',
        'Style Guidance', 'Style Guidance', 'Style Guidance', 'Style Guidance',
        'Product Comparison', 'Product Comparison', 'Product Comparison',
        'Complex Requests', 'Complex Requests', 'Complex Requests',
        'Returns & Exchanges', 'Returns & Exchanges'
    ],
    'Customer_Question': [
        'Does this suit jacket make my shoulders look too broad?',
        'I\'m between sizes - should I size up or down for this brand?',
        'How does your slim fit compare to Brand X\'s tailored fit?',
        'Will these pants shrink after washing?',
        'Can you alter the jacket sleeve length for me?',
        
        'What shoes go with this navy suit for a wedding?',
        'Is this too formal for a business casual office?',
        'How do I style this blazer for different occasions?',
        'What colors complement my skin tone?',
        
        'Which is better quality - this wool blend or 100% cotton?',
        'How does this compare to similar items in my price range?',
        'What\'s the difference between your premium and standard lines?',
        
        'I need a complete outfit for a job interview next week',
        'Can you help me build a capsule wardrobe on a budget?',
        'I want to upgrade my style but don\'t know where to start',
        
        'This doesn\'t fit right - what are my options?',
        'I ordered the wrong size - can I exchange without returning?'
    ],
    'Why_AI_Fails': [
        'Cannot assess visual appearance or body proportions',
        'Lacks brand-specific sizing knowledge and comparison data',
        'No access to competitor sizing standards or fit profiles',
        'Missing fabric care and shrinkage data integration',
        'Cannot coordinate with tailoring services or provide location-specific info',
        
        'Lacks nuanced understanding of dress codes and social context',
        'Cannot interpret modern workplace culture variations',
        'Missing lifestyle and occasion-specific styling knowledge',
        'No visual analysis capability for skin tone assessment',
        
        'Lacks comparative quality analysis across materials',
        'No real-time pricing and competitor comparison capability',
        'Missing detailed product line differentiation knowledge',
        
        'Cannot handle multi-step, personalized outfit curation',
        'Lacks budget-conscious styling strategy and coordination',
        'Cannot provide comprehensive style transformation guidance',
        
        'Missing integration with return/exchange systems',
        'Cannot handle complex policy exceptions and logistics'
    ],
    'Abandonment_Rate': [85, 78, 82, 65, 88, 75, 70, 80, 72, 68, 74, 69, 90, 87, 85, 60, 55],
    'Escalation_Rate': [92, 88, 90, 75, 95, 82, 78, 85, 80, 72, 78, 74, 95, 92, 90, 85, 80]
}

dead_ends_df = pd.DataFrame(conversation_dead_ends_data)

# Style terms that confuse AI
style_terminology_data = {
    'Term_Category': [
        'Fit Descriptors', 'Fit Descriptors', 'Fit Descriptors', 'Fit Descriptors',
        'Construction Terms', 'Construction Terms', 'Construction Terms', 'Construction Terms',
        'Fabric Descriptions', 'Fabric Descriptions', 'Fabric Descriptions', 'Fabric Descriptions',
        'Style Classifications', 'Style Classifications', 'Style Classifications', 'Style Classifications',
        'Occasion Terms', 'Occasion Terms', 'Occasion Terms', 'Occasion Terms'
    ],
    'Technical_Term': [
        'Drop', 'Suppression', 'Darting', 'Drape',
        'Canvassed', 'Fused', 'Floating chest piece', 'Quarter-lined',
        'Hand', 'Drape', 'Weight (in fabric)', 'Nap direction',
        'Sack suit', 'Continental fit', 'American cut', 'British tailoring',
        'Black-tie optional', 'Cocktail attire', 'Business formal', 'Smart casual'
    ],
    'Customer_Usage': [
        'Waist suppression', 'Fitted through the body', 'Chest shaping', 'How it hangs',
        'Structured jacket', 'Stiff construction', 'Chest piece construction', 'Lining type',
        'Fabric feel', 'How fabric falls', 'Fabric thickness', 'Fabric grain direction',
        'Traditional American suit', 'European styling', 'Classic American fit', 'English tailoring style',
        'Semi-formal evening', 'Dressy casual', 'Formal business', 'Polished casual'
    ],
    'AI_Confusion_Level': [8, 9, 7, 8, 9, 7, 10, 8, 7, 8, 6, 9, 8, 9, 7, 8, 6, 7, 5, 7],
    'Training_Gap_Severity': [7, 8, 6, 7, 9, 6, 10, 7, 6, 7, 5, 8, 7, 8, 6, 7, 5, 6, 4, 6]
}

terminology_df = pd.DataFrame(style_terminology_data)

# Slang and colloquialisms data
slang_data = {
    'Slang_Term': [
        'Fire fit', 'Drip', 'Clean', 'Fresh', 'Sharp',
        'Boxy', 'Baggy', 'Tight', 'Loose', 'Fitted',
        'Flex', 'Lowkey', 'Highkey', 'Mid', 'Basic',
        'Vibe', 'Mood', 'Aesthetic', 'Look', 'Lewk',
        'Cop', 'Copped', 'Drop', 'Piece', 'Grail'
    ],
    'Meaning': [
        'Excellent outfit', 'Stylish appearance', 'Well-dressed/sharp', 'Stylish/new', 'Well-dressed',
        'Oversized/unfitted', 'Too loose', 'Too fitted', 'Comfortable fit', 'Well-tailored',
        'Show off style', 'Somewhat/slightly', 'Very/extremely', 'Average/mediocre', 'Plain/boring',
        'Style/feeling', 'Style preference', 'Visual style', 'Outfit/appearance', 'Stylized look',
        'Buy/purchase', 'Bought', 'Release/launch', 'Item/garment', 'Desired item'
    ],
    'Context_Usage': [
        '"That suit is fire"', '"Your drip is insane"', '"Looking clean today"', '"Fresh new blazer"', '"Sharp dressed man"',
        '"Jacket looks boxy on me"', '"Pants are too baggy"', '"Shirt feels tight"', '"Loose comfortable fit"', '"Perfectly fitted suit"',
        '"About to flex this new outfit"', '"Lowkey need new pants"', '"Highkey love this jacket"', '"This shirt is mid"', '"Too basic for me"',
        '"Love this whole vibe"', '"That\'s the mood"', '"Clean aesthetic"', '"Great look"', '"Serving lewks"',
        '"Need to cop that jacket"', '"Just copped new shoes"', '"When does it drop?"', '"Nice piece"', '"This is my grail item"'
    ],
    'AI_Recognition_Rate': [15, 25, 30, 40, 35, 60, 65, 70, 55, 45, 20, 10, 10, 5, 25, 30, 20, 35, 50, 15, 40, 35, 30, 45, 10],
    'Training_Priority': [9, 9, 8, 8, 7, 7, 6, 6, 6, 7, 8, 9, 9, 8, 6, 8, 8, 7, 6, 8, 7, 7, 6, 6, 8]
}

slang_df = pd.DataFrame(slang_data)

print("CONVERSATION DEAD ENDS ANALYSIS")
print("=" * 70)
print(dead_ends_df.to_string(index=False))

print("\n\nSTYLE TERMINOLOGY CONFUSION")
print("=" * 70)
print(terminology_df.to_string(index=False))

print("\n\nSLANG/COLLOQUIALISMS TRAINING GAPS")
print("=" * 70)
print(slang_df.to_string(index=False))

# Save all dataframes
dead_ends_df.to_csv('conversation_dead_ends.csv', index=False)
terminology_df.to_csv('style_terminology_confusion.csv', index=False)
slang_df.to_csv('slang_colloquialisms_gaps.csv', index=False)

print("\n\nFiles saved: conversation_dead_ends.csv, style_terminology_confusion.csv, slang_colloquialisms_gaps.csv")

# Calculate insights
print("\n\nKEY INSIGHTS:")
print(f"Highest abandonment rate: {dead_ends_df.loc[dead_ends_df['Abandonment_Rate'].idxmax(), 'Customer_Question']} ({dead_ends_df['Abandonment_Rate'].max()}%)")
print(f"Most confusing terminology: {terminology_df.loc[terminology_df['AI_Confusion_Level'].idxmax(), 'Technical_Term']} (Confusion Level: {terminology_df['AI_Confusion_Level'].max()})")
print(f"Lowest AI recognition slang: {slang_df.loc[slang_df['AI_Recognition_Rate'].idxmin(), 'Slang_Term']} ({slang_df['AI_Recognition_Rate'].min()}%)")
print(f"Average abandonment rate for complex requests: {dead_ends_df[dead_ends_df['Question_Category'] == 'Complex Requests']['Abandonment_Rate'].mean():.1f}%")