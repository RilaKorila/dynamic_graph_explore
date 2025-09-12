# Dynamic Graph Explorer

A visualization program for community evolution in dynamic graphs

## Overview

This project is a web application that visualizes community evolution patterns (splitting, merging, maintaining, disappearing) in time-series graph data. It synchronizes Alluvial View (community transition diagrams) and Graph View (network diagrams) to enable dynamic community tracking.

## Key Features

### 1. Dynamic Community Visualization
- **Alluvial View**: Represents community transitions over time with curves
- **Graph View**: Visualizes network structure at each time point
- **Synchronized Display**: Synchronizes both views with time slider

### 2. Community Tracking Algorithm
- **Jaccard Similarity**: Calculates similarity between communities
- **Dynamic Community ID**: Automatically tracks community sequences over time
- **Transition Pattern Detection**: Automatically identifies splitting, merging, maintaining, and disappearing patterns

### 3. Interactive Features
- **Time Selection**: Select arbitrary time ranges with slider
- **Community Filtering**: Display only specific communities
- **Fullscreen Display**: Detailed view of individual graphs
- **Color-coded Display**: Consistent coloring based on dynamic community ID

## Architecture

### Backend (FastAPI)
- **Data Distribution**: Provides graph data in CSV format
- **Data Processing**: Automatic detection and ID assignment of dynamic communities
- **API Endpoints**:
  - `GET /data/nodes` - Node data
  - `GET /data/edges` - Edge data
  - `GET /data/alluvial-nodes` - Community data
  - `GET /data/alluvial-links` - Transition data

### Frontend (Next.js + TypeScript)
- **State Management**: Zustand (settings, data, UI state)
- **Visualization**: D3.js + Canvas API (Alluvial View), Sigma.js (Graph View)
- **UI**: Tailwind CSS 4.x

## Data Structure

### Node Data
```csv
node_id,x,y,time,cluster,label,dynamic_community_id
1,12.34,-7.89,1993,C3,Alice,D1
```

### Edge Data
```csv
src,dst,time
1,2,1993
```

### Community Data
```csv
time,community_id,size,label,dynamic_community_id
1993,C14_1993,27,C14,D1
```

## Technology Stack

### Backend
- **Python 3.8+**
- **FastAPI**: Web framework
- **Uvicorn**: ASGI server

### Frontend
- **Next.js 14**: React framework
- **TypeScript**: Type safety
- **Zustand**: State management
- **D3.js**: Data visualization (Alluvial View)
- **Sigma.js**: Graph visualization (Graph View)
- **Canvas API**: High-performance rendering
- **Tailwind CSS 4.x**: Styling

### Data Processing
- **Jaccard Similarity**: Community similarity calculation
- **CSV Parsing**: Data loading and conversion

## Setup & Execution

### 1. Start Backend
```bash
python backend/run.py
```
The backend starts at `http://localhost:8000`.

### 2. Start Frontend
```bash
npm install
npm run dev
```
The frontend starts at `http://localhost:3000`.

### 3. Using the Application
1. Access `http://localhost:3000` in your browser
2. Select time range to display using the time slider
3. Check community transitions in Community Dynamics View
4. Check network structure in Graph View
5. Click individual graphs for fullscreen display

## Available Datasets

### Cit-HepPh (High Energy Physics Paper Co-authorship Network)
- **Period**: 1993-1996
- **Data**: Time-series network of paper co-authorship relationships

### NBAF_coauthors (Co-authorship Network)
- **Period**: 1998-2013
- **Data**: Co-authorship relationships between researchers

## Page Structure

### Main Page (`/`)
- **Time Slider**: Time range selection for display
- **Community Dynamics View**: Alluvial visualization
- **Graph View**: Multi-time graph display
- **Community Legend**: Community legend

### Fullscreen Graph (`/graph/[timestamp]`)
- **Individual Graph Display**: Detailed network for specified time
- **Sigma.js**: Interactive graph manipulation
- **Label Hidden**: Performance optimization

## Main Components

### DynamicCommunityCanvas
- Alluvial View rendering
- Community blocks and transition curves display
- Interactive selection and highlight features

### MultiGraphChart
- Horizontal scroll display of multi-time graphs
- Auto-scroll based on time selection
- Combination of SingleGraphChart components

### TimeSlider
- Time range selection
- Range specification with brush operations
- Automatic detection of available times

### Legend
- Color-coded community display
- Time-based community list
- Coloring based on dynamic community ID

## Development & Customization

### Adding Data
1. Place new datasets in `backend/data/`
2. Adjust data processing logic in `backend/app/process_datasets.py`
3. New data automatically becomes available in frontend

### Color Customization
- Adjust dynamic community coloring in `src/lib/colors.ts`
- Color consistency and distinction algorithm

### Visualization Parameter Adjustment
- Jaccard similarity threshold settings
- Minimum community size settings
- Transition pattern detection condition adjustment

## Citation

The Alluvial Views visualization algorithm references the following paper:

Vehlow, Corinna, et al. "Visualizing the evolution of communities in dynamic graphs." Computer graphics forum. Vol. 34. No. 1. 2015.
