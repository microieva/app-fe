import { Component } from "@angular/core";
import { TREE_DATA } from "../../constants";
import {FlatTreeControl} from '@angular/cdk/tree';
import {MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { AppTreeNode, ExpandableAppTreeNode } from "../../types";
import { Router } from "@angular/router";

@Component({
    selector: 'app-tree',
    templateUrl: './app-tree.component.html',
    styleUrls: ['./app-tree.component.scss']
})
export class AppTreeComponent {

    private _transformer = (node: AppTreeNode, level: number) => {
        return {
          expandable: !!node.children && node.children.length > 0,
          name: node.name,
          level: level,
        };
    };
    treeControl = new FlatTreeControl<ExpandableAppTreeNode>(
        node => node.level,
        node => node.expandable,
    );
    treeFlattener = new MatTreeFlattener(
        this._transformer,
        node => node.level,
        node => node.expandable,
        node => node.children,
    );
    dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
    
    constructor(
        public router: Router
    ){
        this.dataSource.data = TREE_DATA;
    }
    hasChild = (_: number, node: ExpandableAppTreeNode) => node.expandable;

    // navigateToPage(name: string) {
    //     if (name === 'Test Apps') {
    //       this.router.navigate(['test-apps']);
    //     }
    //   }
    getRouterLink(name: string): string[] {
        switch (name) {
            case 'Test Apps':
                return ['test-apps'];
            default:
                return ['/']
        }
    }
}