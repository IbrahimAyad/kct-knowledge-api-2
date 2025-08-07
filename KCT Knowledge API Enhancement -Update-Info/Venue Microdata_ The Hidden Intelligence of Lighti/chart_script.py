import pandas as pd
import plotly.graph_objects as go
import json

# Load the data
data = [
  {"Lighting": "Natural Daylight", "Navy Blue": 2, "Black": 2, "Burgundy": 2, "Emerald Green": 3, "Blush Pink": 2, "Champagne": 1, "Silver": 2, "Gold": 1},
  {"Lighting": "Golden Hour", "Navy Blue": 2, "Black": 2, "Burgundy": 3, "Emerald Green": 2, "Blush Pink": 3, "Champagne": 3, "Silver": 1, "Gold": 3},
  {"Lighting": "Tungsten Indoor", "Navy Blue": 1, "Black": 2, "Burgundy": 3, "Emerald Green": 1, "Blush Pink": 2, "Champagne": 2, "Silver": 1, "Gold": 3},
  {"Lighting": "LED Cool", "Navy Blue": 3, "Black": 2, "Burgundy": 2, "Emerald Green": 3, "Blush Pink": 1, "Champagne": 1, "Silver": 3, "Gold": 1},
  {"Lighting": "LED Warm", "Navy Blue": 2, "Black": 2, "Burgundy": 3, "Emerald Green": 2, "Blush Pink": 2, "Champagne": 2, "Silver": 2, "Gold": 2},
  {"Lighting": "Candlelight", "Navy Blue": 1, "Black": 3, "Burgundy": 3, "Emerald Green": 1, "Blush Pink": 2, "Champagne": 2, "Silver": 1, "Gold": 3}
]

# Convert to DataFrame
df = pd.DataFrame(data)
df.set_index('Lighting', inplace=True)

# Create abbreviated column names (max 15 chars)
color_mapping = {
    'Navy Blue': 'Navy Blue',
    'Black': 'Black', 
    'Burgundy': 'Burgundy',
    'Emerald Green': 'Emerald',
    'Blush Pink': 'Blush Pink',
    'Champagne': 'Champagne',
    'Silver': 'Silver',
    'Gold': 'Gold'
}

# Create abbreviated row names (max 15 chars)
lighting_mapping = {
    'Natural Daylight': 'Natural Day',
    'Golden Hour': 'Golden Hour',
    'Tungsten Indoor': 'Tungsten',
    'LED Cool': 'LED Cool',
    'LED Warm': 'LED Warm',
    'Candlelight': 'Candlelight'
}

# Rename columns and index
df.columns = [color_mapping[col] for col in df.columns]
df.index = [lighting_mapping[idx] for idx in df.index]

# Create the heatmap
fig = go.Figure(data=go.Heatmap(
    z=df.values,
    x=list(df.columns),
    y=list(df.index),
    colorscale=[[0, 'white'], [0.33, '#90EE90'], [0.67, '#32CD32'], [1, '#006400']],
    zmin=0,
    zmax=3,
    text=df.values,
    texttemplate="%{text}",
    textfont={"size": 12},
    hoverongaps=False,
    hovertemplate='Lighting: %{y}<br>Color: %{x}<br>Rating: %{z}<extra></extra>'
))

# Update layout
fig.update_layout(
    title='Lighting Impact on Formal Attire Colors',
    xaxis_title='Color Categories',
    yaxis_title='Lighting Type'
)

# Update axes
fig.update_xaxes(side="bottom")
fig.update_yaxes(autorange="reversed")

# Save the chart
fig.write_image("lighting_color_heatmap.png")