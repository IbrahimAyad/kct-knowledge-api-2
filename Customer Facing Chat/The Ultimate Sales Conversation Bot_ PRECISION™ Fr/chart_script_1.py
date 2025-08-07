import plotly.graph_objects as go

# Data for the comparison - handling different units and scales
data = [
  {"metric": "Conv Rate", "traditional": 22, "precision": 55, "unit": "%"},
  {"metric": "Avg Order", "traditional": 0.8, "precision": 1.2, "unit": "k$"},  # Convert to thousands
  {"metric": "Time to Close", "traditional": 35, "precision": 15, "unit": "min"},
  {"metric": "Cust Sat", "traditional": 78, "precision": 95, "unit": "%"},
  {"metric": "Repeat Rate", "traditional": 15, "precision": 65, "unit": "%"}
]

metrics = [item["metric"] for item in data]
traditional_values = [item["traditional"] for item in data]
precision_values = [item["precision"] for item in data]
units = [item["unit"] for item in data]

# Create hover text with proper units
traditional_hover = [f"{val}{unit}" for val, unit in zip([22, 800, 35, 78, 15], ["%", "$", " min", "%", "%"])]
precision_hover = [f"{val}{unit}" for val, unit in zip([55, 1200, 15, 95, 65], ["%", "$", " min", "%", "%"])]

# Create the grouped bar chart
fig = go.Figure()

# Add Traditional bars
fig.add_trace(go.Bar(
    name='Traditional',
    x=metrics,
    y=traditional_values,
    marker_color='#1FB8CD',
    hovertemplate='<b>%{x}</b><br>Traditional: %{customdata}<extra></extra>',
    customdata=traditional_hover
))

# Add PRECISION bars
fig.add_trace(go.Bar(
    name='PRECISION™',
    x=metrics,
    y=precision_values,
    marker_color='#DB4545',
    hovertemplate='<b>%{x}</b><br>PRECISION™: %{customdata}<extra></extra>',
    customdata=precision_hover
))

# Update layout
fig.update_layout(
    title='Traditional vs PRECISION Performance',
    xaxis_title='Performance Metrics',
    yaxis_title='Metric Values',
    barmode='group',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

# Rotate x-axis labels for better readability
fig.update_xaxes(tickangle=45)

# Add note about different units in hover
fig.add_annotation(
    text="*Hover for exact values with units",
    xref="paper", yref="paper",
    x=0, y=-0.15,
    showarrow=False,
    font=dict(size=10, color="gray")
)

# Save the chart
fig.write_image("performance_comparison.png")