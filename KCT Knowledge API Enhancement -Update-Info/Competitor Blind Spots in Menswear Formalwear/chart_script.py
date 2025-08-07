import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# Data from the provided JSON
questions = [
    "How do I know if my shoulders actually fit vs just looking big?",
    "Why do size 40Rs fit differently across every brand I try?", 
    "What alterations actually improve fit vs just waste money?",
    "How do I fix shoulder divots without buying a new suit?",
    "Can I wear brown shoes with navy suits for evening events?",
    "What patterns can I mix without looking like a costume?",
    "How formal is too formal for modern business casual?",
    "What colors work for olive/darker skin tones in formalwear?",
    "How do I dress for broad shoulders and narrow waist?",
    "What works for short torso, long legs proportions?", 
    "How do athletic builds avoid the stuffed sausage look?",
    "What's appropriate for afternoon vs evening wedding?",
    "How do I dress for video calls vs in-person meetings?",
    "What works for client dinners that aren't black-tie?",
    "Is $300 vs $800 suit actually worth the difference?",
    "How long should a quality suit last with regular wear?",
    "What details indicate quality construction vs marketing?"
]

opportunity_ratings = [9, 10, 8, 7, 8, 9, 7, 8, 9, 8, 8, 9, 10, 8, 9, 7, 8]

# Map questions to categories
categories = [
    "Fit & Sizing", "Fit & Sizing", "Fit & Sizing", "Fit & Sizing",
    "Style Combi", "Style Combi", "Style Combi", 
    "Body Type", "Body Type", "Body Type", "Body Type",
    "Occasion", "Occasion", "Occasion",
    "Quality & Value", "Quality & Value", "Quality & Value"
]

# Create shorter, readable question labels
questions_short = [
    "Shoulder fit",
    "Size variance", 
    "Alterations",
    "Shoulder divots",
    "Brown/navy combo",
    "Pattern mixing",
    "Business casual",
    "Skin tone colors",
    "Broad shoulders",
    "Short torso",
    "Athletic builds",
    "Wedding timing",
    "Video vs person",
    "Client dinners",
    "$300 vs $800",
    "Suit lifespan",
    "Quality details"
]

# Create opportunity level categories
opportunity_levels = []
colors = []
for rating in opportunity_ratings:
    if rating >= 9:
        opportunity_levels.append("High (9-10)")
        colors.append('#1FB8CD')  # Strong cyan
    elif rating >= 7:
        opportunity_levels.append("Med (7-8)")
        colors.append('#2E8B57')  # Sea green
    else:
        opportunity_levels.append("Low (<7)")
        colors.append('#DB4545')  # Bright red

# Create DataFrame
df = pd.DataFrame({
    'Question': questions_short,
    'Category': categories, 
    'Rating': opportunity_ratings,
    'Opp Level': opportunity_levels,
    'Color': colors
})

# Sort by category and rating for better visualization
df = df.sort_values(['Category', 'Rating'], ascending=[True, False])

# Create the figure
fig = go.Figure()

# Add bars with individual colors
for i, row in df.iterrows():
    fig.add_trace(go.Bar(
        x=[row['Rating']],
        y=[row['Question']],
        orientation='h',
        marker_color=row['Color'],
        name=row['Opp Level'],
        showlegend=False,
        hovertemplate=f"<b>{row['Question']}</b><br>Category: {row['Category']}<br>Rating: {row['Rating']}<br>Level: {row['Opp Level']}<extra></extra>"
    ))

# Add legend manually
legend_items = [
    {'name': 'High (9-10)', 'color': '#1FB8CD'},
    {'name': 'Med (7-8)', 'color': '#2E8B57'},
    {'name': 'Low (<7)', 'color': '#DB4545'}
]

for item in legend_items:
    fig.add_trace(go.Bar(
        x=[None],
        y=[None],
        marker_color=item['color'],
        name=item['name'],
        showlegend=True
    ))

# Update layout
fig.update_layout(
    title='Competitor Blind Spots Analysis',
    xaxis_title='Opp Rating',
    yaxis_title='Questions',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5),
    showlegend=True
)

# Update axes
fig.update_xaxes(range=[0, 11])
fig.update_yaxes(categoryorder='array', categoryarray=df['Question'].tolist())

# Save the chart
fig.write_image('competitor_blind_spots_analysis.png')