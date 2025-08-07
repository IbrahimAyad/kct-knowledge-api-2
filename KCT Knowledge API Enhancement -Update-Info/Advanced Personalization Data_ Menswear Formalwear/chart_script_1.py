import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# Load the data
data = [
  {
    "Workout_Type": "Weight Training",
    "Shoulder_Adjustments": 85,
    "Chest_Torso_Fitting": 90,
    "Sleeve_Modifications": 75,
    "Trouser_Alterations": 65
  },
  {
    "Workout_Type": "Cardio",
    "Shoulder_Adjustments": 25,
    "Chest_Torso_Fitting": 30,
    "Sleeve_Modifications": 20,
    "Trouser_Alterations": 15
  },
  {
    "Workout_Type": "Mixed Training",
    "Shoulder_Adjustments": 60,
    "Chest_Torso_Fitting": 70,
    "Sleeve_Modifications": 55,
    "Trouser_Alterations": 45
  },
  {
    "Workout_Type": "Minimal Exercise",
    "Shoulder_Adjustments": 15,
    "Chest_Torso_Fitting": 20,
    "Sleeve_Modifications": 10,
    "Trouser_Alterations": 12
  }
]

df = pd.DataFrame(data)

# Abbreviate labels to meet 15 character limit
df['Workout_Type'] = df['Workout_Type'].replace('Minimal Exercise', 'Minimal Ex')

# Melt the dataframe for grouped bar chart
df_melted = df.melt(id_vars=['Workout_Type'], 
                    var_name='Alteration_Type', 
                    value_name='Percentage')

# Abbreviate alteration types to meet 15 character limit
df_melted['Alteration_Type'] = df_melted['Alteration_Type'].replace({
    'Shoulder_Adjustments': 'Shoulder Adj',
    'Chest_Torso_Fitting': 'Chest/Torso',
    'Sleeve_Modifications': 'Sleeve Mods',
    'Trouser_Alterations': 'Trouser Alt'
})

# Define colors in the specified order
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F']

# Create grouped bar chart (not stacked)
fig = px.bar(df_melted, 
             x='Workout_Type', 
             y='Percentage',
             color='Alteration_Type',
             color_discrete_sequence=colors,
             title='Workout vs Suit Alterations',
             barmode='group')

# Update layout following the guidelines
fig.update_layout(
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5),
    yaxis_title='% Requiring Alts',
    xaxis_title='Workout Type'
)

# Update traces for better hover information
fig.update_traces(cliponaxis=False)

# Save the chart
fig.write_image('workout_suit_alterations.png')