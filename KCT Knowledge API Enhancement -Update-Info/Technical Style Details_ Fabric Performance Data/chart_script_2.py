import pandas as pd
import plotly.graph_objects as go
import numpy as np

# Data from the provided JSON
fabric_types = ["Navy Wool", "Charcoal Wool", "Black Wool", "Light Gray Wool", "Brown Wool", 
                "Navy Cotton", "White Cotton", "Cream Cotton", "Light Blue Cotton", 
                "Dark Linen", "Light Linen", "Beige Linen", "Silk Blend", "Polyester"]

fair_skin = [9, 8, 7, 6, 8, 8, 5, 7, 9, 8, 6, 7, 8, 7]
medium_skin = [9, 9, 8, 7, 9, 8, 8, 8, 8, 9, 8, 9, 9, 7]
dark_skin = [8, 7, 6, 9, 7, 7, 10, 9, 8, 7, 9, 8, 8, 6]
olive_skin = [9, 8, 7, 7, 9, 8, 7, 8, 7, 8, 7, 8, 9, 7]

# Create matrix for heatmap
data_matrix = [fair_skin, medium_skin, dark_skin, olive_skin]
data_matrix = np.array(data_matrix).T  # Transpose so fabrics are rows

# Abbreviated column names (15 char limit)
column_names = ["Fair", "Medium", "Dark", "Olive"]

# Abbreviated fabric names (15 char limit)
fabric_names_short = []
for fabric in fabric_types:
    if len(fabric) <= 15:
        fabric_names_short.append(fabric)
    else:
        # Abbreviate longer names
        if "Cotton" in fabric:
            fabric_names_short.append(fabric.replace("Cotton", "Cot"))
        elif "Linen" in fabric:
            fabric_names_short.append(fabric.replace("Linen", "Lin"))
        else:
            fabric_names_short.append(fabric[:15])

# Create heatmap
fig = go.Figure(data=go.Heatmap(
    z=data_matrix,
    x=column_names,
    y=fabric_names_short,
    colorscale='Blues',  # Professional color scheme, darker = higher values
    colorbar=dict(
        title="Rating"
    ),
    hovertemplate='<b>%{y}</b><br>%{x} Skin: %{z}<extra></extra>',
    zmin=1,
    zmax=10
))

# Update layout
fig.update_layout(
    title="Fabric Photo Performance by Skin Tone",
    xaxis_title="Skin Tone",
    yaxis_title="Fabric Type"
)

# Update axes
fig.update_xaxes(side="top")
fig.update_yaxes(autorange="reversed")

# Save the chart
fig.write_image("fabric_heatmap.png")