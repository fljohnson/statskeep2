import React, { Component } from 'react';
import { FlatListBasics } from './Home.js';
import { Entry } from './Entry.js';
import {createAppContainer} from 'react-navigation';
import {createStackNavigator} from 'react-navigation-stack';

const MainNavigator = createStackNavigator({
  Home: {screen: FlatListBasics,	  
	  navigationOptions:{
		title: 'Stats',
	  },
  }, 
  Line: {screen: Entry,
	  navigationOptions:{
		title: 'Single Entry',
	  }
	 },
},{
    mode: 'modal',
  });

const App = createAppContainer(MainNavigator);

export default App;
