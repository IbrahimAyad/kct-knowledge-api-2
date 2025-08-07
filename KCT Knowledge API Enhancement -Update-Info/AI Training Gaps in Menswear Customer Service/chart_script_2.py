import pandas as pd
import plotly.graph_objects as go
import numpy as np

# Data from the provided JSON
categories = ["Fit Descriptors", "Construction Terms", "Fabric Descriptions", "Style Classifications", "Occasion Terms"]
terms = ["Drop", "Suppression", "Darting", "Drape", "Canvassed", "Fused", "Floating chest piece", "Quarter-lined", "Hand", "Drape", "Weight (in fabric)", "Nap direction", "Sack suit", "Continental fit", "American cut", "British tailoring", "Black-tie optional", "Cocktail attire", "Business formal", "Smart casual"]
confusion_levels = [8, 9, 7, 8, 9, 7, 10, 8, 7, 8, 6, 9, 8, 9, 7, 8, 6, 7, 5, 7]
category_mapping = ["Fit Descriptors", "Fit Descriptors", "Fit Descriptors", "Fit Descriptors", "Construction Terms", "Construction Terms", "Construction Terms", "Construction Terms", "Fabric Descriptions", "Fabric Descriptions", "Fabric Descriptions", "Fabric Descriptions", "Style Classifications", "Style Classifications", "Style Classifications", "Style Classifications", "Occasion Terms", "Occasion Terms", "Occasion Terms", "Occasion Terms"]

# Create DataFrame
df = pd.DataFrame({
    'Term': terms,
    'Category': category_mapping,
    'Confusion': confusion_levels
})

# Abbreviate long terms to fit 15 character limit
term_abbrev = {
    'Floating chest piece': 'Float Chest',
    'Quarter-lined': 'Quarter-Lined',
    'Weight (in fabric)': 'Fabric Weight',
    'Continental fit': 'Continental',
    'American cut': 'American',
    'British tailoring': 'British',
    'Black-tie optional': 'Black-Tie Opt',
    'Cocktail attire': 'Cocktail',
    'Business formal': 'Business',
    'Smart casual': 'Smart Casual'
}

# Apply abbreviations
df['Term_Short'] = df['Term'].map(lambda x: term_abbrev.get(x, x))

# Category abbreviations
category_abbrev = {
    'Fit Descriptors': 'Fit',
    'Construction Terms': 'Construction', 
    'Fabric Descriptions': 'Fabric',
    'Style Classifications': 'Style',
    'Occasion Terms': 'Occasion'
}

# Create matrix where rows are categories and columns are individual terms
matrix_data = []
y_labels = []
x_labels = []
hover_text = []

# Get all unique abbreviated terms in order
for cat in categories:
    cat_data = df[df['Category'] == cat].reset_index(drop=True)
    for _, row in cat_data.iterrows():
        x_labels.append(row['Term_Short'])

# Create y labels (categories)
for cat in categories:
    y_labels.append(category_abbrev[cat])

# Create the matrix
for cat in categories:
    cat_data = df[df['Category'] == cat].reset_index(drop=True)
    row_data = []
    row_hover = []
    
    term_idx = 0
    for all_cat in categories:
        all_cat_data = df[df['Category'] == all_cat].reset_index(drop=True)
        for _, term_row in all_cat_data.iterrows():
            if all_cat == cat:
                # This term belongs to current category
                confusion = term_row['Confusion']
                row_data.append(confusion)
                row_hover.append(f'Category: {cat}<br>Term: {term_row["Term"]}<br>Confusion: {confusion}')
            else:
                # This term doesn't belong to current category
                row_data.append(0)
                row_hover.append('')
            term_idx += 1
    
    matrix_data.append(row_data)
    hover_text.append(row_hover)

# Create custom colorscale to make 0 values transparent/white
colorscale = [
    [0, 'white'],
    [0.1, '#fee5d9'],
    [0.3, '#fcbba1'],
    [0.5, '#fc9272'],
    [0.7, '#fb6a4a'],
    [0.9, '#de2d26'],
    [1.0, '#a50f15']
]

# Create heatmap
fig = go.Figure(data=go.Heatmap(
    z=matrix_data,
    x=x_labels,
    y=y_labels,
    colorscale=colorscale,
    colorbar=dict(
        title='Confusion Level',
        tickvals=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    ),
    hovertemplate='%{hovertext}<extra></extra>',
    hovertext=hover_text,
    zmin=0,
    zmax=10,
    showscale=True
))

# Update layout
fig.update_layout(
    title='AI Terminology Confusion Heatmap',
    xaxis_title='Terms',
    yaxis_title='Categories'
)

# Update axes for better readability
fig.update_xaxes(
    tickangle=45,
    side='bottom'
)
fig.update_yaxes(
    autorange='reversed'
)

# Save the chart
fig.write_image('terminology_confusion_heatmap.png')