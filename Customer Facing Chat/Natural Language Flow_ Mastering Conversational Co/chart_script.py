import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

# Create the data
data = [
    {"stage": "Greeting & Discovery", "sample_phrase": "Hi there! Looking for something special today?", "next_transition": "Tell me more about...", "stage_number": 1},
    {"stage": "Needs Assessment", "sample_phrase": "What's the occasion?", "next_transition": "Based on what you've told me...", "stage_number": 2},
    {"stage": "Product Presentation", "sample_phrase": "Let me show you a few options that would work perfectly", "next_transition": "I understand the investment is significant...", "stage_number": 3},
    {"stage": "Address Concerns", "sample_phrase": "Don't worry about the fit - that's what alterations are for", "next_transition": "You look fantastic in this", "stage_number": 4},
    {"stage": "Decision Support", "sample_phrase": "This is exactly what you need for your event", "next_transition": "Now that we have your suit sorted...", "stage_number": 5},
    {"stage": "Complementary Sales", "sample_phrase": "Let's think about shirts and accessories", "next_transition": "Perfect! Let's get everything organized", "stage_number": 6},
    {"stage": "Closing & Follow-up", "sample_phrase": "Excellent choice - you're going to love wearing this", "next_transition": "Complete", "stage_number": 7}
]

df = pd.DataFrame(data)

# Define colors for each stage (using the provided brand colors)
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F', '#D2BA4C', '#B4413C', '#964325']

# Create the figure
fig = go.Figure()

# Add nodes (stages) as scatter points with boxes
for i, row in df.iterrows():
    # Truncate stage name to 15 characters
    stage_short = row['stage'][:15] if len(row['stage']) <= 15 else row['stage'][:12] + "..."
    
    fig.add_trace(go.Scatter(
        x=[row['stage_number']], 
        y=[1],
        mode='markers+text',
        marker=dict(
            size=100,
            color=colors[i],
            symbol='square',
            line=dict(width=2, color='white')
        ),
        text=f"{row['stage_number']}",
        textposition="middle center",
        textfont=dict(size=14, color='white', family='Arial Black'),
        name=stage_short,
        hovertemplate=f"<b>{stage_short}</b><br>" +
                     f"Sample: {row['sample_phrase'][:40]}...<br>" +
                     f"Next: {row['next_transition'][:30]}...<br>" +
                     "<extra></extra>",
        showlegend=True,
        cliponaxis=False
    ))

# Add connecting arrows between stages
for i in range(len(df) - 1):
    # Add arrow line
    fig.add_trace(go.Scatter(
        x=[df.iloc[i]['stage_number'] + 0.4, df.iloc[i+1]['stage_number'] - 0.4],
        y=[1, 1],
        mode='lines',
        line=dict(color='#666666', width=4),
        showlegend=False,
        hoverinfo='skip',
        cliponaxis=False
    ))
    
    # Add arrowhead
    fig.add_trace(go.Scatter(
        x=[df.iloc[i+1]['stage_number'] - 0.4],
        y=[1],
        mode='markers',
        marker=dict(
            symbol='triangle-right',
            size=12,
            color='#666666'
        ),
        showlegend=False,
        hoverinfo='skip',
        cliponaxis=False
    ))

# Update layout
fig.update_layout(
    title="Menswear Sales Flow",
    xaxis=dict(
        showgrid=False,
        showticklabels=False,
        zeroline=False,
        range=[0.3, 7.7]
    ),
    yaxis=dict(
        showgrid=False,
        showticklabels=False,
        zeroline=False,
        range=[0.3, 1.7]
    ),
    plot_bgcolor='white',
    legend=dict(
        orientation='v',
        yanchor='middle',
        y=0.5,
        xanchor='left',
        x=1.02
    )
)

fig.write_image("menswear_consultation_flowchart.png")