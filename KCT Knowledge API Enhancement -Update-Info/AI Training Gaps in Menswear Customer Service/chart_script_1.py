import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# Create the dataset
data = {
    "slang_terms": ["Fire fit", "Drip", "Clean", "Fresh", "Sharp", "Boxy", "Baggy", "Tight", "Loose", "Fitted", "Flex", "Lowkey", "Highkey", "Mid", "Basic", "Vibe", "Mood", "Aesthetic", "Look", "Lewk", "Cop", "Copped", "Drop", "Piece", "Grail"],
    "recognition_rates": [15, 25, 30, 40, 35, 60, 65, 70, 55, 45, 20, 10, 10, 5, 25, 30, 20, 35, 50, 15, 40, 35, 30, 45, 10],
    "training_priorities": [9, 9, 8, 8, 7, 7, 6, 6, 6, 7, 8, 9, 9, 8, 6, 8, 8, 7, 6, 8, 7, 7, 6, 6, 8]
}

df = pd.DataFrame(data)

# Categorize terms
def categorize_term(term):
    style_terms = ["Fire fit", "Drip", "Clean", "Fresh", "Sharp", "Aesthetic", "Look", "Lewk", "Vibe", "Mood"]
    fit_terms = ["Boxy", "Baggy", "Tight", "Loose", "Fitted"]
    intensity_terms = ["Flex", "Lowkey", "Highkey", "Mid", "Basic"]
    purchase_terms = ["Cop", "Copped", "Drop", "Piece", "Grail"]
    
    if term in style_terms:
        return "Style"
    elif term in fit_terms:
        return "Fit"  
    elif term in intensity_terms:
        return "Intensity"
    elif term in purchase_terms:
        return "Purchase"
    else:
        return "Other"

df['category'] = df['slang_terms'].apply(categorize_term)

# Create bubble size based on training priority (importance/frequency)
df['bubble_size'] = df['training_priorities'] * 6

# Create the scatter plot
fig = go.Figure()

# Define colors for categories
category_colors = {
    "Style": "#1FB8CD",
    "Fit": "#DB4545", 
    "Intensity": "#2E8B57",
    "Purchase": "#5D878F",
    "Other": "#D2BA4C"
}

# Add scatter points for each category
for category in df['category'].unique():
    category_data = df[df['category'] == category]
    
    fig.add_trace(go.Scatter(
        x=category_data['recognition_rates'],
        y=category_data['training_priorities'],
        mode='markers',
        marker=dict(
            size=category_data['bubble_size'],
            color=category_colors[category],
            opacity=0.8,
            line=dict(width=2, color='white')
        ),
        name=category,
        text=category_data['slang_terms'],
        hovertemplate='<b>%{text}</b><br>Recognition: %{x}%<br>Priority: %{y}<extra></extra>',
        cliponaxis=False
    ))

# Update layout
fig.update_layout(
    title='Slang AI Training Gaps by Category',
    xaxis_title='Recognition %',
    yaxis_title='Priority',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5),
    showlegend=True
)

# Update axes
fig.update_xaxes(range=[0, 100])
fig.update_yaxes(range=[1, 10])

# Save the chart
fig.write_image("ai_recognition_gaps.png")