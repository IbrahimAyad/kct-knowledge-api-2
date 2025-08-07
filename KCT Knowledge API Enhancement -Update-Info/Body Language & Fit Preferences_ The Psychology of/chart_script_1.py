import plotly.graph_objects as go
import json

# Data provided
data = [
    {"profession": "Lawyers", "Authority": 9, "Trustworthiness": 9, "Creativity": 3, "Approachability": 6, "Success": 7, "Tradition": 9},
    {"profession": "Investment Bankers", "Authority": 8, "Trustworthiness": 7, "Creativity": 4, "Approachability": 4, "Success": 10, "Tradition": 6},
    {"profession": "Consultants", "Authority": 7, "Trustworthiness": 8, "Creativity": 6, "Approachability": 8, "Success": 8, "Tradition": 7},
    {"profession": "Creative Industries", "Authority": 5, "Trustworthiness": 6, "Creativity": 10, "Approachability": 9, "Success": 7, "Tradition": 3}
]

# Define dimensions
dimensions = ["Authority", "Trustworthness", "Creativity", "Approachblty", "Success", "Tradition"]
original_dims = ["Authority", "Trustworthiness", "Creativity", "Approachability", "Success", "Tradition"]

# Brand colors
colors = ["#1FB8CD", "#DB4545", "#2E8B57", "#5D878F"]

# Create figure
fig = go.Figure()

# Add traces for each profession
for i, profession_data in enumerate(data):
    # Get values for each dimension
    values = [profession_data[dim] for dim in original_dims]
    # Close the radar chart by adding first value at the end
    values.append(values[0])
    
    # Add dimension names, also close the loop
    theta = dimensions + [dimensions[0]]
    
    fig.add_trace(go.Scatterpolar(
        r=values,
        theta=theta,
        fill='toself',
        name=profession_data["profession"],
        line_color=colors[i],
        fillcolor=colors[i],
        opacity=0.3
    ))

# Update layout
fig.update_layout(
    title="Professional Suit Body Language",
    polar=dict(
        radialaxis=dict(
            visible=True,
            range=[0, 10]
        )
    ),
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

# Save the chart
fig.write_image("radar_chart.png")