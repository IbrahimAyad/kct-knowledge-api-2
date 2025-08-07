import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# Data from the provided JSON
price_ranges = ["$100-200", "$200-350", "$350-500", "$500-1000", "$1000-2000", "$2000+"]
comparison_intensity = ["Very High", "High", "Moderate", "Low", "Very Low", "Minimal"]
bundle_effectiveness = ["Low-Moderate", "High", "High", "Moderate", "Low", "Very Low"]

# Convert categorical data to numerical values for visualization
intensity_mapping = {
    "Very High": 6,
    "High": 5,
    "Moderate": 4,
    "Low": 3,
    "Very Low": 2,
    "Minimal": 1
}

effectiveness_mapping = {
    "High": 5,
    "Moderate": 4,
    "Low-Moderate": 3,
    "Low": 2,
    "Very Low": 1
}

# Convert to numerical values
intensity_values = [intensity_mapping[x] for x in comparison_intensity]
effectiveness_values = [effectiveness_mapping[x] for x in bundle_effectiveness]

# Brand colors for each price range
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F', '#D2BA4C', '#B4413C']

# Create subplots with 2 rows
fig = make_subplots(
    rows=2, cols=1,
    subplot_titles=('Compare Shop Intensity', 'Bundle Effectiveness'),
    vertical_spacing=0.15
)

# Add bar chart for comparison shopping intensity
fig.add_trace(
    go.Bar(
        x=price_ranges,
        y=intensity_values,
        marker_color=colors[:len(price_ranges)],
        name='Compare Shop',
        showlegend=False,
        cliponaxis=False
    ),
    row=1, col=1
)

# Add line chart for bundle effectiveness
fig.add_trace(
    go.Scatter(
        x=price_ranges,
        y=effectiveness_values,
        mode='lines+markers',
        line=dict(color=colors[1], width=3),
        marker=dict(size=8, color=colors[1]),
        name='Bundle Effect',
        showlegend=False,
        cliponaxis=False
    ),
    row=2, col=1
)

# Update layout
fig.update_layout(
    title='Menswear Price Sensitivity Mapping',
    showlegend=False
)

# Update y-axes with appropriate labels
fig.update_yaxes(
    title_text="Intensity",
    tickmode='array',
    tickvals=[1, 2, 3, 4, 5, 6],
    ticktext=['Min', 'V.Low', 'Low', 'Mod', 'High', 'V.High'],
    row=1, col=1
)

fig.update_yaxes(
    title_text="Effectiveness",
    tickmode='array',
    tickvals=[1, 2, 3, 4, 5],
    ticktext=['V.Low', 'Low', 'Low-Mod', 'Mod', 'High'],
    row=2, col=1
)

# Update x-axes
fig.update_xaxes(title_text="Price Range", row=1, col=1)
fig.update_xaxes(title_text="Price Range", row=2, col=1)

# Save the chart
fig.write_image('menswear_price_sensitivity.png')