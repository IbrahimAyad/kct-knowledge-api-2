import plotly.graph_objects as go

# Data for emotional triggers (following 15 character limit for labels)
words = ["Bespoke", "Custom", "Premium", "Luxury", "Confidence", "Power", "Perfect Fit", "Sophisticated", "Craftsmanship", "Commanding", "Distinguished", "Tailored", "Success", "Authority", "Elegant"]
impact = [28, 26, 25, 24, 23, 22, 22, 21, 21, 21, 20, 20, 20, 19, 19]

# Shorten labels to meet 15 character limit
short_words = ["Bespoke", "Custom", "Premium", "Luxury", "Confidence", "Power", "Perfect Fit", "Sophisticated", "Craftsmanship", "Commanding", "Distinguished", "Tailored", "Success", "Authority", "Elegant"]

# Create color scale from high impact (darker) to low impact (lighter)
# Using the primary brand color #1FB8CD as base and creating gradient
colors = []
max_impact = max(impact)
min_impact = min(impact)

for i in impact:
    # Normalize the impact value between 0 and 1
    normalized = (i - min_impact) / (max_impact - min_impact)
    # Create gradient from light to dark cyan
    opacity = 0.4 + (0.6 * normalized)  # opacity from 0.4 to 1.0
    colors.append(f'rgba(31, 184, 205, {opacity})')

# Create horizontal bar chart
fig = go.Figure(go.Bar(
    x=impact,
    y=short_words,
    orientation='h',
    marker=dict(color=colors),
    text=[f'{i}%' for i in impact],
    textposition='outside',
    hovertemplate='<b>%{y}</b><br>Impact: %{x}%<extra></extra>'
))

# Update layout
fig.update_layout(
    title='Emotional Trigger Impact Analysis',
    xaxis_title='Purchase Impact (%)',
    yaxis_title='Trigger Words',
    yaxis=dict(autorange='reversed'),  # Reverse to show highest impact at top
    showlegend=False
)

# Update x-axis to show percentage format
fig.update_xaxes(
    ticksuffix='%'
)

# Save the chart
fig.write_image('emotional_triggers_chart.png')