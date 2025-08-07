import plotly.graph_objects as go
import pandas as pd

# Load the data
data = [
    {"stage": "Initial Contact", "frustrated": 80, "disappointed": 15, "angry": 5, "hopeful": 0, "relieved": 0, "satisfied": 0, "confident": 0, "grateful": 0, "delighted": 0, "advocate": 0, "loyal": 0},
    {"stage": "After Empathetic Discovery", "frustrated": 40, "disappointed": 0, "angry": 0, "hopeful": 45, "relieved": 15, "satisfied": 0, "confident": 0, "grateful": 0, "delighted": 0, "advocate": 0, "loyal": 0},
    {"stage": "After Resolution Architecture", "frustrated": 0, "disappointed": 0, "angry": 0, "hopeful": 0, "relieved": 0, "satisfied": 60, "confident": 30, "grateful": 10, "delighted": 0, "advocate": 0, "loyal": 0},
    {"stage": "After Loyalty Acceleration", "frustrated": 0, "disappointed": 0, "angry": 0, "hopeful": 0, "relieved": 0, "satisfied": 0, "confident": 0, "grateful": 0, "delighted": 70, "advocate": 25, "loyal": 5}
]

df = pd.DataFrame(data)

# Abbreviate stage names to fit 15 character limit
stage_abbreviations = ['Initial Contact', 'Empathetic', 'Resolution', 'Loyalty']

# Define emotions with their colors - negative emotions use red tones, positive use other colors
emotion_colors = {
    'frustrated': '#DB4545',    # Bright red (negative)
    'disappointed': '#B4413C',  # Moderate red (negative)
    'angry': '#944454',         # Pink-red (negative)
    'hopeful': '#1FB8CD',       # Strong cyan (positive)
    'relieved': '#2E8B57',      # Sea green (positive)
    'satisfied': '#5D878F',     # Cyan (positive)
    'confident': '#D2BA4C',     # Moderate yellow (positive)
    'grateful': '#964325',      # Dark orange (positive)
    'delighted': '#1FB8CD',     # Strong cyan (positive)
    'advocate': '#2E8B57',      # Sea green (positive)
    'loyal': '#D2BA4C'          # Moderate yellow (positive)
}

# Get all emotions that have non-zero values across all stages
emotions_to_show = []
for emotion in emotion_colors.keys():
    if df[emotion].sum() > 0:
        emotions_to_show.append(emotion)

fig = go.Figure()

# Add traces for each emotion that appears in the data
for emotion in emotions_to_show:
    values = df[emotion].tolist()
    # Only show text labels for non-zero values
    text_labels = [f'{v}%' if v > 0 else '' for v in values]
    
    fig.add_trace(go.Bar(
        name=emotion.capitalize(),
        y=stage_abbreviations,
        x=values,
        orientation='h',
        marker_color=emotion_colors[emotion],
        text=text_labels,
        textposition='inside',
        cliponaxis=False
    ))

fig.update_layout(
    title='Customer Sentiment Transform',
    barmode='stack',
    yaxis_title='RESTORE Stage',
    xaxis_title='Percentage (%)',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

fig.update_xaxes(range=[0, 100])

# Save the chart
fig.write_image('sentiment_transformation.png')