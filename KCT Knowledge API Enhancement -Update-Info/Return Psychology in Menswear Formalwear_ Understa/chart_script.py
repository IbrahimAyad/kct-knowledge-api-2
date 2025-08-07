import plotly.graph_objects as go
import json

# Data from the provided JSON
data = {
    "models": [
        {"name": "Expectation vs Reality Gap", "percentage": 35},
        {"name": "Overordering/Bracketing", "percentage": 28},
        {"name": "Size Inconsistency Distrust", "percentage": 22},
        {"name": "Emotional Shopping/Buyer's Remorse", "percentage": 10},
        {"name": "Fear of Commitment", "percentage": 5}
    ]
}

# Extract data and create shortened labels (15 char limit)
models = [item["name"] for item in data["models"]]
percentages = [item["percentage"] for item in data["models"]]

# Shortened labels to meet 15 character limit
short_labels = [
    "Expect vs Real",
    "Overordering", 
    "Size Distrust",
    "Emotional Shop",
    "Fear Commit"
]

# Brand colors in order
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F', '#D2BA4C']

# Create horizontal bar chart
fig = go.Figure(go.Bar(
    x=percentages,
    y=short_labels,
    orientation='h',
    marker_color=colors,
    text=[f'{p}%' for p in percentages],
    textposition='inside',
    cliponaxis=False,
    hovertemplate='<b>%{y}</b><br>%{x}%<extra></extra>'
))

# Update layout
fig.update_layout(
    title="Fit Return Mental Models",
    xaxis_title="Percentage",
    yaxis_title="Mental Model",
    showlegend=False
)

# Save the chart
fig.write_image("mental_models_chart.png")