import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import json

# Load data from the provided JSON
data = {
    "cue_categories": ["Construction Details", "Construction Details", "Construction Details", "Construction Details", "Fabric Quality", "Fabric Quality", "Fabric Quality", "Fabric Quality", "Finishing Details", "Finishing Details", "Finishing Details", "Finishing Details", "Fit Indicators", "Fit Indicators", "Fit Indicators", "Fit Indicators", "Hardware Quality", "Hardware Quality", "Hardware Quality", "Hardware Quality"],
    "recognition_rates": [45, 65, 35, 75, 80, 85, 70, 72, 90, 55, 40, 68, 95, 88, 82, 78, 60, 50, 45, 85],
    "visibility": [60, 75, 25, 85, 90, 95, 80, 82, 95, 70, 50, 78, 98, 92, 88, 85, 70, 60, 55, 88],
    "quality_impact": [9, 8, 10, 7, 9, 8, 8, 7, 9, 6, 7, 8, 10, 9, 8, 9, 7, 6, 5, 6],
    "cue_names": ["Hand-stitched buttonholes", "Lapel roll naturalness", "Canvas construction visibility", "Seam straightness", "Fabric drape quality", "Pattern matching precision", "Fabric weight appearance", "Surface texture consistency", "Collar gap at neck", "Sleeve button functionality", "Lining quality visibility", "Edge finishing cleanliness", "Shoulder line smoothness", "Jacket length proportion", "Trouser break positioning", "Waist suppression shape", "Button material quality", "Zipper brand/quality", "Hardware finish consistency", "Thread color matching"]
}

# Create DataFrame
df = pd.DataFrame(data)

# Define colors for categories using brand colors
color_map = {
    "Construction Details": "#1FB8CD",
    "Fabric Quality": "#DB4545", 
    "Finishing Details": "#2E8B57",
    "Fit Indicators": "#5D878F",
    "Hardware Quality": "#D2BA4C"
}

# Create bubble chart
fig = go.Figure()

# Add bubbles for each category
for category in df['cue_categories'].unique():
    category_data = df[df['cue_categories'] == category]
    
    fig.add_trace(go.Scatter(
        x=category_data['recognition_rates'],
        y=category_data['visibility'],
        mode='markers',
        marker=dict(
            size=category_data['quality_impact'] * 5,  # Scale bubble size
            color=color_map[category],
            sizemode='diameter',
            line=dict(width=1, color='white')
        ),
        name=category[:15],  # Truncate category names to 15 chars
        text=category_data['cue_names'],
        hovertemplate='<b>%{text}</b><br>' +
                     'Recognition: %{x}%<br>' +
                     'Visibility: %{y}%<br>' +
                     'Impact: %{marker.size}<br>' +
                     '<extra></extra>',
        cliponaxis=False
    ))

# Add quadrant lines
fig.add_hline(y=50, line_dash="dash", line_color="gray", opacity=0.5)
fig.add_vline(x=50, line_dash="dash", line_color="gray", opacity=0.5)

# Add quadrant labels as annotations
fig.add_annotation(x=75, y=75, text="High Rec/High Vis", showarrow=False, 
                  font=dict(size=12, color="gray"), opacity=0.7)
fig.add_annotation(x=25, y=75, text="Low Rec/High Vis", showarrow=False,
                  font=dict(size=12, color="gray"), opacity=0.7)
fig.add_annotation(x=75, y=25, text="High Rec/Low Vis", showarrow=False,
                  font=dict(size=12, color="gray"), opacity=0.7)
fig.add_annotation(x=25, y=25, text="Low Rec/Low Vis", showarrow=False,
                  font=dict(size=12, color="gray"), opacity=0.7)

# Update layout
fig.update_layout(
    title="Quality Cues Recognition Analysis",
    xaxis_title="Recognition (%)",
    yaxis_title="Visibility (%)",
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

# Update axes
fig.update_xaxes(range=[0, 100], dtick=25)
fig.update_yaxes(range=[0, 100], dtick=25)

# Save the chart
fig.write_image("quality_cues_bubble_chart.png")