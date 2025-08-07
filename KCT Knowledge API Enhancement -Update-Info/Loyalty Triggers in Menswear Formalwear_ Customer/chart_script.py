import plotly.graph_objects as go
import plotly.express as px
import numpy as np

# Data for emotional triggers
triggers = ["Perfect Fit Experience", "Self-Expression Alignment", "Exceptional Service", 
           "Milestone Celebration", "Quality Craftsmanship", "Problem Resolution", 
           "Personal Styling", "Success Association", "Exclusive Access", "Brand Heritage Story"]
impact_scores = [9.2, 8.9, 8.8, 8.7, 8.6, 8.5, 8.4, 8.3, 8.1, 7.9]

# Abbreviate trigger names to fit 15 character limit more meaningfully
triggers_abbrev = ["Perfect Fit Exp", "Self-Expression", "Except Service", "Milestone Celeb", 
                  "Quality Craft", "Problem Resolve", "Personal Style", "Success Assoc", 
                  "Exclusive Access", "Brand Heritage"]

# Create gradient colors from darkest (highest score) to lightest (lowest score)
# Using a gradient from dark cyan to light cyan
gradient_colors = ['#13343B', '#1A3E47', '#204853', '#27525F', '#2D5C6B', 
                  '#346677', '#3A7083', '#417A8F', '#47849B', '#4E8EA7']

# Create horizontal bar chart
fig = go.Figure(data=go.Bar(
    y=triggers_abbrev,
    x=impact_scores,
    orientation='h',
    marker=dict(color=gradient_colors),
    text=[f'{score}' for score in impact_scores],
    textposition='outside',
    cliponaxis=False
))

# Update layout
fig.update_layout(
    title="Emotional Triggers Impact",
    xaxis_title="Impact Score",
    yaxis_title="Triggers"
)

# Update axes for better readability
fig.update_xaxes(range=[0, 10], dtick=1)
fig.update_yaxes(categoryorder='total ascending')

# Save the chart
fig.write_image("emotional_triggers_impact.png")