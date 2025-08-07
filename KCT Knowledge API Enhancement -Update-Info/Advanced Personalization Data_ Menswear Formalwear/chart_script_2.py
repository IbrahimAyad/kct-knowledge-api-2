import plotly.graph_objects as go
import pandas as pd

# Data for the radar chart
data = [
    {
        "Hobby_Category": "Sports/Fitness",
        "Style_Influence_Score": 85,
        "Color_Preference_Impact": 70,
        "Fabric_Choice_Impact": 80,
        "Fit_Preference_Impact": 90,
        "Accessory_Integration": 75,
        "Brand_Alignment": 85
    },
    {
        "Hobby_Category": "Music/Arts",
        "Style_Influence_Score": 78,
        "Color_Preference_Impact": 85,
        "Fabric_Choice_Impact": 65,
        "Fit_Preference_Impact": 60,
        "Accessory_Integration": 90,
        "Brand_Alignment": 75
    },
    {
        "Hobby_Category": "Technology",
        "Style_Influence_Score": 65,
        "Color_Preference_Impact": 60,
        "Fabric_Choice_Impact": 55,
        "Fit_Preference_Impact": 50,
        "Accessory_Integration": 70,
        "Brand_Alignment": 80
    },
    {
        "Hobby_Category": "Outdoor Activities",
        "Style_Influence_Score": 82,
        "Color_Preference_Impact": 80,
        "Fabric_Choice_Impact": 85,
        "Fit_Preference_Impact": 75,
        "Accessory_Integration": 80,
        "Brand_Alignment": 70
    },
    {
        "Hobby_Category": "Professional Networking",
        "Style_Influence_Score": 90,
        "Color_Preference_Impact": 65,
        "Fabric_Choice_Impact": 70,
        "Fit_Preference_Impact": 80,
        "Accessory_Integration": 85,
        "Brand_Alignment": 95
    }
]

df = pd.DataFrame(data)

# Define abbreviated axis labels (15 char limit)
categories = ['Style Influ', 'Color Pref', 'Fabric Choice', 'Fit Pref', 'Accessory Int', 'Brand Align']

# Define colors for each hobby
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F', '#D2BA4C']

# Create the radar chart
fig = go.Figure()

# Add each hobby as a separate trace
for i, row in df.iterrows():
    values = [
        row['Style_Influence_Score'],
        row['Color_Preference_Impact'], 
        row['Fabric_Choice_Impact'],
        row['Fit_Preference_Impact'],
        row['Accessory_Integration'],
        row['Brand_Alignment']
    ]
    
    fig.add_trace(go.Scatterpolar(
        r=values,
        theta=categories,
        fill='toself',
        name=row['Hobby_Category'],
        line_color=colors[i],
        fillcolor=colors[i],
        opacity=0.3
    ))

# Update layout
fig.update_layout(
    polar=dict(
        radialaxis=dict(
            visible=True,
            range=[0, 100]
        )),
    title="Hobby Influence on Menswear Style",
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

# Save the chart
fig.write_image("hobby_style_radar_chart.png")