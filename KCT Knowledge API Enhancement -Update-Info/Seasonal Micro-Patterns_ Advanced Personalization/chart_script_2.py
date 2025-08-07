import plotly.graph_objects as go
import pandas as pd
import json

# Load the data
data = [
  {
    "Category": "Color Preferences",
    "Holiday_Party_Score": 8,
    "Wedding_Score": 2
  },
  {
    "Category": "Fabric Choices",
    "Holiday_Party_Score": 7,
    "Wedding_Score": 3
  },
  {
    "Category": "Accessories",
    "Holiday_Party_Score": 9,
    "Wedding_Score": 1
  },
  {
    "Category": "Formality Level",
    "Holiday_Party_Score": 6,
    "Wedding_Score": 8
  },
  {
    "Category": "Seasonal Timing",
    "Holiday_Party_Score": 9,
    "Wedding_Score": 3
  },
  {
    "Category": "Price Sensitivity",
    "Holiday_Party_Score": 5,
    "Wedding_Score": 8
  },
  {
    "Category": "Style Innovation", 
    "Holiday_Party_Score": 9,
    "Wedding_Score": 2
  },
  {
    "Category": "Group Coordination",
    "Holiday_Party_Score": 2,
    "Wedding_Score": 8
  }
]

df = pd.DataFrame(data)

# Abbreviate category names to meet 15 character limit
category_mapping = {
    "Color Preferences": "Color Prefs",
    "Fabric Choices": "Fabric Choices",
    "Accessories": "Accessories", 
    "Formality Level": "Formality Level",
    "Seasonal Timing": "Seasonal Timing",
    "Price Sensitivity": "Price Sens",
    "Style Innovation": "Style Innov",
    "Group Coordination": "Group Coord"
}

categories = [category_mapping[cat] for cat in df['Category']]

# Create the radar chart
fig = go.Figure()

# Add Holiday Party trace
fig.add_trace(go.Scatterpolar(
    r=df['Holiday_Party_Score'],
    theta=categories,
    fill='toself',
    name='Holiday Party',
    line_color='#1FB8CD',
    fillcolor='rgba(31, 184, 205, 0.3)'
))

# Add Wedding trace
fig.add_trace(go.Scatterpolar(
    r=df['Wedding_Score'],
    theta=categories,
    fill='toself',
    name='Wedding',
    line_color='#DB4545',
    fillcolor='rgba(219, 69, 69, 0.3)'
))

# Update layout
fig.update_layout(
    polar=dict(
        radialaxis=dict(
            visible=True,
            range=[0, 10]
        )
    ),
    title="Holiday vs Wedding Fashion Trends",
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

# Save the chart
fig.write_image("radar_chart.png")