import {isPresent, isString, StringWrapper, isBlank, isArray} from 'angular2/src/facade/lang';
import {
  DoCheck,
  OnDestroy,
  Directive,
  ElementRef,
  IterableDiffer,
  IterableDiffers,
  KeyValueDiffer,
  KeyValueDiffers,
  Renderer
} from 'angular2/core';
import {StringMapWrapper, isListLikeIterable} from 'angular2/src/facade/collection';

/**
 * The `NgClass` directive conditionally adds and removes CSS classes on an HTML element based on
 * an expression's evaluation result.
 *
 * The result of an expression evaluation is interpreted differently depending on type of
 * the expression evaluation result:
 * - `string` - all the CSS classes listed in a string (space delimited) are added
 * - `Array` - all the CSS classes (Array elements) are added
 * - `Object` - each key corresponds to a CSS class name while values are interpreted as expressions
 * evaluating to `Boolean`. If a given expression evaluates to `true` a corresponding CSS class
 * is added - otherwise it is removed.
 *
 * While the `NgClass` directive can interpret expressions evaluating to `string`, `Array`
 * or `Object`, the `Object`-based version is the most often used and has an advantage of keeping
 * all the CSS class names in a template.
 *
 * ### Example ([live demo](http://plnkr.co/edit/a4YdtmWywhJ33uqfpPPn?p=preview)):
 *
 * ```
 * import {Component, NgClass} from 'angular2/angular2';
 *
 * @Component({
 *   selector: 'toggle-button',
 *   inputs: ['isDisabled'],
 *   template: `
 *      <div class="button" [ngClass]="{active: isOn, disabled: isDisabled}"
 *          (click)="toggle(!isOn)">
 *          Click me!
 *      </div>`,
 *   styles: [`
 *     .button {
 *       width: 120px;
 *       border: medium solid black;
 *     }
 *
 *     .active {
 *       background-color: red;
 *    }
 *
 *     .disabled {
 *       color: gray;
 *       border: medium solid gray;
 *     }
 *   `]
 *   directives: [NgClass]
 * })
 * class ToggleButton {
 *   isOn = false;
 *   isDisabled = false;
 *
 *   toggle(newState) {
 *     if (!this.isDisabled) {
 *       this.isOn = newState;
 *     }
 *   }
 * }
 * ```
 */
@Directive({selector: '[ngClass]', inputs: ['rawClass: ngClass', 'initialClasses: class']})
export class NgClass implements DoCheck, OnDestroy {
  private _differ: any;
  private _mode: string;
  private _initialClasses = [];
  private _rawClass;

  constructor(private _iterableDiffers: IterableDiffers, private _keyValueDiffers: KeyValueDiffers,
              private _ngEl: ElementRef, private _renderer: Renderer) {}

  set initialClasses(v) {
    this._applyInitialClasses(true);
    this._initialClasses = isPresent(v) && isString(v) ? v.split(' ') : [];
    this._applyInitialClasses(false);
    this._applyClasses(this._rawClass, false);
  }

  set rawClass(v) {
    this._cleanupClasses(this._rawClass);

    if (isString(v)) {
      v = v.split(' ');
    }

    this._rawClass = v;
    if (isPresent(v)) {
      if (isListLikeIterable(v)) {
        this._differ = this._iterableDiffers.find(v).create(null);
        this._mode = 'iterable';
      } else {
        this._differ = this._keyValueDiffers.find(v).create(null);
        this._mode = 'keyValue';
      }
    } else {
      this._differ = null;
    }
  }

  ngDoCheck(): void {
    if (isPresent(this._differ)) {
      var changes = this._differ.diff(this._rawClass);
      if (isPresent(changes)) {
        if (this._mode == 'iterable') {
          this._applyIterableChanges(changes);
        } else {
          this._applyKeyValueChanges(changes);
        }
      }
    }
  }

  ngOnDestroy(): void { this._cleanupClasses(this._rawClass); }

  private _cleanupClasses(rawClassVal): void {
    this._applyClasses(rawClassVal, true);
    this._applyInitialClasses(false);
  }

  private _applyKeyValueChanges(changes: any): void {
    changes.forEachAddedItem((record) => { this._toggleClass(record.key, record.currentValue); });
    changes.forEachChangedItem((record) => { this._toggleClass(record.key, record.currentValue); });
    changes.forEachRemovedItem((record) => {
      if (record.previousValue) {
        this._toggleClass(record.key, false);
      }
    });
  }

  private _applyIterableChanges(changes: any): void {
    changes.forEachAddedItem((record) => { this._toggleClass(record.item, true); });
    changes.forEachRemovedItem((record) => { this._toggleClass(record.item, false); });
  }

  private _applyInitialClasses(isCleanup: boolean) {
    this._initialClasses.forEach(className => this._toggleClass(className, !isCleanup));
  }

  private _applyClasses(rawClassVal: string[] | Set<string>| {[key: string]: string},
                        isCleanup: boolean) {
    if (isPresent(rawClassVal)) {
      if (isArray(rawClassVal)) {
        (<string[]>rawClassVal).forEach(className => this._toggleClass(className, !isCleanup));
      } else if (rawClassVal instanceof Set) {
        (<Set<string>>rawClassVal).forEach(className => this._toggleClass(className, !isCleanup));
      } else {
        StringMapWrapper.forEach(<{[k: string]: string}>rawClassVal, (expVal, className) => {
          if (expVal) this._toggleClass(className, !isCleanup);
        });
      }
    }
  }

  private _toggleClass(className: string, enabled): void {
    className = className.trim();
    if (className.length > 0) {
      if (className.indexOf(' ') > -1) {
        var classes = className.split(/\s+/g);
        for (var i = 0, len = classes.length; i < len; i++) {
          this._renderer.setElementClass(this._ngEl, classes[i], enabled);
        }
      } else {
        this._renderer.setElementClass(this._ngEl, className, enabled);
      }
    }
  }
}
