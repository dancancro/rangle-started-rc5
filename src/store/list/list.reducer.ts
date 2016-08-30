// import Immutable = require('immutable');
import { List } from 'immutable';
import { Map } from 'immutable';
import { Record } from 'immutable';

import { IPayloadAction } from '../../actions';
import { ListActions } from '../../actions/list.actions';
import { IList } from './list.types';
import { IListRecord } from './list.types';
import { INITIAL_LIST_STATE } from './list.initial-state';
import { IObjection } from './list.types';
import { IObjectionRecord } from './list.types';
import { IRebuttal } from './list.types';
import { ListFactory } from './list.initial-state';
import { ObjectionFactory } from './list.initial-state';
import { RebuttalFactory } from './list.initial-state';
import { NewRebuttalFactory } from './list.initial-state';

export function listReducer(state: IListRecord = INITIAL_LIST_STATE,
  action: IPayloadAction): IListRecord {
  
  // TODO: make the functions pure
  // is it bad to have member state variables in an action creator? does that make the functions not pure?
  // if i don't do this then these lookups will have to go in several functions'
  let objections = (<IListRecord>state).get('objections');
  let objectionIndex = action.payload && action.payload.objection 
        ? findObjectionIndex(objections, action.payload.objection.id) 
        : undefined;
  let rebuttals = objectionIndex !== undefined 
        ? objections.getIn([objectionIndex, 'rebuttals']) 
        : undefined;
  let rebuttalIndex = rebuttals && action.payload.rebuttal 
        ? findRebuttalIndex(rebuttals, action.payload.rebuttal.id) 
        : undefined;
  let rebuttal = action.payload 
        ? action.payload.rebuttal 
        : undefined;

  switch (action.type) {

    // List actions

    case ListActions.OBJECTIONS_FETCHED_OK:
      return state.merge(
          {
            // Make an IObjection out of every POJO objection. Then replace each one's array of POJO rebuttals with a List of IRebuttals'
            objections: List([...action.payload.objections]
                              .map(objection => ObjectionFactory(objection).update('rebuttals', (rebuttals) => List(rebuttals.map((rebuttal) => RebuttalFactory(rebuttal))))))
          });

    case ListActions.OBJECTION_ADDED:
      return state.update('objections', (objections) => objections.push(ObjectionFactory()));

    case ListActions.OBJECTIONS_REORDERED:
      return state;

    case ListActions.ALL_EXPANDED:
      return expandAll(state, objections, action, true);

    case ListActions.ALL_COLLAPSED:
      return expandAll(state, objections, action, false);

    case ListActions.EDITABLE_TOGGLED:
      return updateListField(state, action, 'editable', !state.get('editable'));
      // this.options.disabled = !this.options.disabled;   // draggabilitty

    case ListActions.ALL_SAVED:
    // this.objectionStore.objections.forEach(objection => {
    //   objection.reordered = false;
    //   objection.rebuttals.forEach(rebuttal =>
    //     rebuttal.touched = false);
    // });
    // this.touched = false;
     return state;
      
    // Objection actions

    case ListActions.REBUTTAL_ADDED:
      return state.updateIn(['objections', objectionIndex, 'rebuttals'],   
                             (rebuttals: List<IRebuttal>) => rebuttals.push(NewRebuttalFactory()));
      
    case ListActions.OBJECTION_STARRED:
      return updateOneObjection(state, objectionIndex, 'star', true);

    case ListActions.OBJECTION_EXPANDED:
      return updateOneObjection(state, objectionIndex, 'expanded', true);

    case ListActions.OBJECTION_COLLAPSED:
      return updateOneObjection(state, objectionIndex, 'expanded', false);

    case ListActions.REBUTTALS_REORDERED:
      return updateOneObjection(state, objectionIndex, 'rebuttalsReordered', true);

    // Rebuttal actions

    case ListActions.REBUTTAL_CANCELED:
      return updateRebuttalField(state, rebuttalIndex, objectionIndex, 'editing', false);

    case ListActions.REBUTTAL_SAVED:
      let newRebuttal = action.payload.newRebuttal;
      let touched = 
        newRebuttal.shortName.value !== rebuttal.shortName ||
        newRebuttal.longName.value !== rebuttal.longName ||
        newRebuttal.link.value !== rebuttal.link ||
        (newRebuttal.comments.value || '') !== (rebuttal.comments || '');
      return state.updateIn(['objections', objectionIndex, 'rebuttals', rebuttalIndex], () => RebuttalFactory({
        id: action.payload.rebuttal.id,
        shortName: action.payload.newRebuttal.shortName.value, 
        longName: action.payload.newRebuttal.longName.value,
        link: action.payload.newRebuttal.link.value,
        comments: action.payload.newRebuttal.comments.value,
        touched: touched,
        editing: false})
      );
    
    case ListActions.REBUTTAL_MADE_EDITABLE:
      return updateRebuttalField(state, rebuttalIndex, objectionIndex, 'editing', true);
      
    default:
      return state;
  }
}

function findObjectionIndex(objections: List<IObjection>, id): number {
  return objections.findIndex((objection) => objection.id === id);
}

function findRebuttalIndex(rebuttals: List<IRebuttal>, id): number {
  return rebuttals.findIndex((rebuttal) => rebuttal.id === id);
}

function updateOneObjection(state: IListRecord, objectionIndex: number, fieldName: string, value: any): IListRecord {
  return (<IListRecord>state).update('objections', 
          (objections: List<IObjectionRecord>) =>
             objections.update(
               objectionIndex, (objection: IObjectionRecord) => 
                 objection.update(fieldName, () => value)
               )
        );
}

function updateAllObjections(state: IListRecord, action: IPayloadAction, objections: List<IObjection>, fieldName: string, value: any): IListRecord {
  let _state = state;
  state.get('objections').forEach(objection => {
      let objectionIndex = findObjectionIndex(objections, objection.id);
      action = Object.assign({}, action, {payload: {objection: objection}});
      _state = updateOneObjection(_state, objectionIndex, fieldName, value);
    }
  );
  return _state;
}

function expandAll(state: IListRecord, objections: List<IObjection>, action: IPayloadAction, expand: boolean) {
  let _state = updateAllObjections(state, action, objections, 'expanded', expand);
  return updateListField(_state, action, 'expanded', expand);
}

function updateListField(state: IListRecord, action: IPayloadAction, fieldName: string, value: any): IListRecord {
    return state.update(fieldName, () => value );
}

function updateRebuttalField(state: IListRecord, rebuttalIndex: number, objectionIndex: number, fieldName: string, value: any): IListRecord {
    return state.updateIn([
                            'objections',
                            objectionIndex, 
                            'rebuttals', 
                            rebuttalIndex, 
                            fieldName], 
                            () => value);
}
