import plotly.graph_objects as go
import pandas as pd

# Data from the provided JSON
fabric_data = {
    "fabric_types": ["Worsted Wool (100%)", "Super 150s Wool", "Cotton Twill", "Linen (100%)", "Polyester (100%)", "Wool-Polyester Blend"],
    "durability": [9, 6, 7, 5, 8, 7],
    "wrinkle_resistance": [8, 5, 4, 2, 9, 8],
    "breathability": [8, 8, 9, 10, 3, 6],
    "shape_retention": [9, 6, 6, 4, 8, 7],
    "moisture_management": [7, 7, 8, 9, 2, 5],
    "lifespan_normalized": [10, 5, 6, 3, 8, 7]
}

# Performance metrics (abbreviated to 15 chars max)
metrics = ['Durability', 'Wrinkle Resist', 'Breathability', 'Shape Retain', 'Moisture Mgmt', 'Lifespan']

# Brand colors for the 6 fabric types
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F', '#D2BA4C', '#B4413C']

# Create the radar chart
fig = go.Figure()

# Add each fabric type as a separate trace
for i, fabric in enumerate(fabric_data["fabric_types"]):
    values = [
        fabric_data["durability"][i],
        fabric_data["wrinkle_resistance"][i], 
        fabric_data["breathability"][i],
        fabric_data["shape_retention"][i],
        fabric_data["moisture_management"][i],
        fabric_data["lifespan_normalized"][i]
    ]
    
    # Abbreviate fabric names to fit legend (15 char limit)
    fabric_name = fabric.replace("(100%)", "").replace("Wool-Polyester Blend", "Wool-Poly").strip()
    if len(fabric_name) > 15:
        fabric_name = fabric_name[:15]
    
    fig.add_trace(go.Scatterpolar(
        r=values,
        theta=metrics,
        fill='none',
        name=fabric_name,
        line=dict(color=colors[i], width=3),
        marker=dict(size=6, color=colors[i])
    ))

# Update layout for the radar chart
fig.update_layout(
    polar=dict(
        radialaxis=dict(
            visible=True,
            range=[0, 10],
            tickmode='linear',
            tick0=0,
            dtick=2
        )
    ),
    title='Fabric Performance Analysis',
    showlegend=True
)

# Save the chart
fig.write_image("fabric_performance_radar.png")