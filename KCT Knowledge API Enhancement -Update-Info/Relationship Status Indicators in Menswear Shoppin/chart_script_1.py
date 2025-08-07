import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# Create DataFrame from the provided data
data = {
    "specific_changes": ["Joint shopping sessions", "Preference for tailored fit", "Quality over quantity mindset", "Budget planning integration", "Focus on proper proportions", "Increased neutral palette", "Longer decision timelines", "Shift to navy/gray dominance", "Investment in alterations", "Business casual upgrade", "Move to premium brands", "Brand consistency seeking", "Weekend attire elevation", "Reduced bold color choices", "Increased formal wear frequency"],
    "percentages": [94, 89, 88, 87, 83, 82, 81, 78, 76, 72, 71, 69, 68, 65, 85],
    "categories": ["Shopping Behavior", "Fit Preferences", "Brand Preferences", "Shopping Behavior", "Fit Preferences", "Color Preferences", "Shopping Behavior", "Color Preferences", "Fit Preferences", "Formality Level", "Brand Preferences", "Brand Preferences", "Formality Level", "Color Preferences", "Formality Level"]
}

df = pd.DataFrame(data)

# Create better abbreviated labels within 15 character limit
abbreviations = {
    "Joint shopping sessions": "Joint shopping",
    "Preference for tailored fit": "Tailored fit",
    "Quality over quantity mindset": "Quality>quantity",
    "Budget planning integration": "Budget planning",
    "Focus on proper proportions": "Proper proportns",
    "Increased neutral palette": "Neutral palette", 
    "Longer decision timelines": "Longer timeline",
    "Shift to navy/gray dominance": "Navy/gray shift",
    "Investment in alterations": "Alterations",
    "Business casual upgrade": "Business casual",
    "Move to premium brands": "Premium brands",
    "Brand consistency seeking": "Brand consist.",
    "Weekend attire elevation": "Weekend upgrade",
    "Reduced bold color choices": "Less bold color",
    "Increased formal wear frequency": "More formal"
}

df['specific_changes_short'] = df['specific_changes'].map(abbreviations)

# Sort by percentage from highest to lowest
df = df.sort_values('percentages', ascending=True)  # ascending=True for horizontal bar chart

# Define color mapping for categories with shorter names
color_map = {
    'Shopping Behavior': '#1FB8CD',
    'Fit Preferences': '#DB4545', 
    'Brand Preferences': '#2E8B57',
    'Color Preferences': '#5D878F',
    'Formality Level': '#D2BA4C'
}

# Abbreviate category names for legend
category_abbrev = {
    'Shopping Behavior': 'Shopping',
    'Fit Preferences': 'Fit',
    'Brand Preferences': 'Brand',
    'Color Preferences': 'Color',
    'Formality Level': 'Formality'
}

# Create horizontal bar chart
fig = go.Figure()

for category in df['categories'].unique():
    category_data = df[df['categories'] == category]
    fig.add_trace(go.Bar(
        y=category_data['specific_changes_short'],
        x=category_data['percentages'],
        name=category_abbrev[category],
        orientation='h',
        marker_color=color_map[category],
        text=[f"{p}%" for p in category_data['percentages']],
        textposition='outside',
        cliponaxis=False
    ))

# Update layout - center legend since there are 5 categories (5 or fewer)
fig.update_layout(
    title="Post-Engagement Style Changes",
    xaxis_title="Percentage (%)",
    yaxis_title="Style Changes",
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5),
    barmode='group'
)

# Update axes
fig.update_xaxes(range=[0, 100])
fig.update_yaxes()

# Save the chart
fig.write_image("post_engagement_style_changes.png")