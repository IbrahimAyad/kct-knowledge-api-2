import pandas as pd
import plotly.graph_objects as go
import plotly.io as pio

# Create the dataset
data = [
    {"Career_Stage": "Entry Level", "Average_Wardrobe_Investment": 1500, "Style_Formality_Score": 60},
    {"Career_Stage": "Mid-Level", "Average_Wardrobe_Investment": 3000, "Style_Formality_Score": 70},
    {"Career_Stage": "Senior Manager", "Average_Wardrobe_Investment": 5000, "Style_Formality_Score": 80},
    {"Career_Stage": "Director", "Average_Wardrobe_Investment": 8000, "Style_Formality_Score": 85},
    {"Career_Stage": "VP/Executive", "Average_Wardrobe_Investment": 12000, "Style_Formality_Score": 90},
    {"Career_Stage": "C-Suite", "Average_Wardrobe_Investment": 20000, "Style_Formality_Score": 95}
]

df = pd.DataFrame(data)

# Abbreviate career stage names for better display
stage_mapping = {
    "Entry Level": "Entry",
    "Mid-Level": "Mid-Level", 
    "Senior Manager": "Sr Mgr",
    "Director": "Director",
    "VP/Executive": "VP/Exec",
    "C-Suite": "C-Suite"
}

df['Career_Stage_Short'] = df['Career_Stage'].map(stage_mapping)

# Create the figure with investment values in thousands
fig = go.Figure()

# Add wardrobe investment line (in thousands)
fig.add_trace(go.Scatter(
    x=df['Career_Stage_Short'],
    y=df['Average_Wardrobe_Investment'] / 1000,  # Convert to thousands
    mode='lines+markers',
    name='Investment ($k)',
    line=dict(color='#1FB8CD', width=3),
    marker=dict(size=8),
    hovertemplate='<b>%{x}</b><br>Investment: $%{y}k<br><extra></extra>',
    cliponaxis=False
))

# Add style formality line (scaled to match investment range for visual comparison)
formality_scaled = df['Style_Formality_Score'] * 0.2  # Scale down formality to fit with investment range
fig.add_trace(go.Scatter(
    x=df['Career_Stage_Short'],
    y=formality_scaled,
    mode='lines+markers',
    name='Formality (x5)',
    line=dict(color='#DB4545', width=3),
    marker=dict(size=8),
    hovertemplate='<b>%{x}</b><br>Formality: %{customdata}%<br><extra></extra>',
    customdata=df['Style_Formality_Score'],
    cliponaxis=False
))

# Update layout
fig.update_layout(
    title='Career & Wardrobe Evolution',
    xaxis_title='Career Stage',
    yaxis_title='Investment ($k)',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5),
    showlegend=True
)

# Update axes
fig.update_xaxes()
fig.update_yaxes(range=[0, 22])

# Add annotation to explain the scaling
fig.add_annotation(
    text="Red line scaled 5x for comparison",
    xref="paper", yref="paper",
    x=0.02, y=0.98,
    showarrow=False,
    font=dict(size=10, color="gray"),
    align="left"
)

# Save the chart
fig.write_image("career_wardrobe_evolution.png")