import plotly.graph_objects as go
import json

# Parse the provided data
data = {
    "categories": [
        {
            "name": "Technology Solutions",
            "strategies": [
                {"name": "AI Sizing Tools", "reduction": 25},
                {"name": "Virtual Try-On", "reduction": 18},
                {"name": "3D Body Scanning", "reduction": 24}
            ]
        },
        {
            "name": "Content & Communication", 
            "strategies": [
                {"name": "Detailed Size Guides", "reduction": 15},
                {"name": "Customer Reviews/Fit Feedback", "reduction": 12},
                {"name": "High-Quality Product Images", "reduction": 10}
            ]
        },
        {
            "name": "Policy & Process",
            "strategies": [
                {"name": "Flexible Exchange Policies", "reduction": 8},
                {"name": "Post-Purchase Follow-up", "reduction": 6},
                {"name": "Size Recommendation Nudges", "reduction": 14}
            ]
        }
    ]
}

# Brand colors
colors = ['#1FB8CD', '#DB4545', '#2E8B57']

# Create the figure
fig = go.Figure()

# Abbreviate strategy names to fit 15 character limit
abbreviations = {
    "AI Sizing Tools": "AI Sizing",
    "Virtual Try-On": "Virtual Try-On", 
    "3D Body Scanning": "3D Body Scan",
    "Detailed Size Guides": "Size Guides",
    "Customer Reviews/Fit Feedback": "Review/Fit",
    "High-Quality Product Images": "Product Images",
    "Flexible Exchange Policies": "Exchange Policy",
    "Post-Purchase Follow-up": "Follow-up",
    "Size Recommendation Nudges": "Size Nudges"
}

# Add traces for each category
for i, category in enumerate(data['categories']):
    strategies = [abbreviations[strategy['name']] for strategy in category['strategies']]
    reductions = [strategy['reduction'] for strategy in category['strategies']]
    
    fig.add_trace(go.Bar(
        name=category['name'],
        y=strategies,
        x=reductions,
        orientation='h',
        marker_color=colors[i],
        cliponaxis=False,
        text=[f"{r}%" for r in reductions],
        textposition='outside'
    ))

# Update layout
fig.update_layout(
    title="Return Prevention Strategy Effectiveness",
    xaxis_title="Reduction %",
    yaxis_title="Strategy",
    barmode='group',
    legend=dict(
        orientation='h',
        yanchor='bottom',
        y=1.05,
        xanchor='center',
        x=0.5
    )
)

# Save the chart
fig.write_image("return_prevention_effectiveness.png")