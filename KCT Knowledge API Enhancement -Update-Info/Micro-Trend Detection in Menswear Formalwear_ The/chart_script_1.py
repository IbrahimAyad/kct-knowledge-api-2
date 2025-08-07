import plotly.graph_objects as go
import plotly.io as pio

# Data for the chart
data = [
    {"event": "Met Gala 2025", "emv_millions": 552, "type": "Cultural Gala"},
    {"event": "Paris Olympics", "emv_millions": 163, "type": "Sports Event"},
    {"event": "Fashion Weeks", "emv_millions": 400, "type": "Fashion Event"},
    {"event": "Local Events", "emv_millions": 50, "type": "Local Events"}
]

# Brand colors in order
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F']

# Extract data for plotting
events = [item["event"] for item in data]
values = [item["emv_millions"] for item in data]

# Create horizontal bar chart
fig = go.Figure()

for i, (event, value) in enumerate(zip(events, values)):
    fig.add_trace(go.Bar(
        y=[event],
        x=[value],
        orientation='h',
        marker_color=colors[i],
        text=[f'{value}m'],
        textposition='inside',
        textfont=dict(color='white', size=14),
        showlegend=False,
        cliponaxis=False
    ))

# Update layout
fig.update_layout(
    title="Cultural Events Fashion Impact 2025",
    xaxis_title="EMV (Millions)",
    yaxis_title="Events"
)

# Save the chart
fig.write_image("cultural_events_fashion_impact.png")