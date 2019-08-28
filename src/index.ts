import "core-js/stable/symbol";
import "core-js/stable/symbol/iterator.js";
import "core-js/stable/dom-collections/for-each"
import "regenerator-runtime/runtime";

class Cell {
  public element: HTMLElement;
  public tags: Set<string>;
  public enabled: boolean = true;
  public isVisible: boolean = true;
  public timeoutID: number | null = null;


  constructor(element: HTMLElement, tagsString: string) {
    this.element = element;
    this.tags = new Set(tagsString.split(" "));
  }

  public CancelTimeout() {
    if (this.timeoutID !== null) {
      clearInterval(this.timeoutID);
      this.timeoutID = null;
    }
  }
}

class LayoutManager {
  private static cellsSelector = ".cell";
  private static cellsContainerSelector = ".cells";
  private static cellContentsSelector = ".cell-contents";
  private static cellIDAttribute = "data-cell-id";

  private static menuItemContactSelector = ".show-about";
  private static menuItemPartialSelector = ".show-";
  private static menuItemSelector = ".menu-item";
  private static menuItemSelectedClass = "on";

  private static aboutContactSelector = ".about-contact";
  private static aboutViewsSelector = ".about";
  private static aboutViewPartialSelector = ".about-";
  private static aboutViewEnabledClass = "show";

  private static enableAnimationClass = "enable-animation";
  private static tags = ["website", "unity3d", "software"];
  private static animationSpeed = 1500;

  private readonly cells: Cell[] = [];
  private readonly container: HTMLElement;
  private readonly contactLink: HTMLElement;
  private readonly contactPage: HTMLElement;

  constructor() {
    // init properties
    this.container = document.querySelector(LayoutManager.cellsContainerSelector)as HTMLElement;
    this.contactLink = document.querySelector(LayoutManager.menuItemContactSelector) as HTMLElement;
    this.contactPage = document.querySelector(LayoutManager.aboutContactSelector) as HTMLElement;

    document.querySelectorAll(LayoutManager.cellsSelector).forEach(cellElement => {
      this.cells.push(new Cell(
          cellElement as HTMLElement,
          cellElement.className
      ))
    });

    // setup the actions for the menu filters
    for (const tag of LayoutManager.tags) {
      const menuItem = document.querySelector(LayoutManager.menuItemPartialSelector + tag)!;
      // menuItem.classList.remove(LayoutManager.menuItemSelectedClass);

      menuItem.addEventListener("click", () => {
        this.contactPage.classList.remove(LayoutManager.aboutViewEnabledClass);

        const isOn = menuItem.classList.contains(LayoutManager.menuItemSelectedClass);
        document.querySelectorAll(LayoutManager.menuItemSelector).forEach(
            x => x.classList.remove(LayoutManager.menuItemSelectedClass)
        );

        if (isOn === false) {
          menuItem.classList.add(LayoutManager.menuItemSelectedClass);
          this.FilterCells(tag);
        } else {
          this.FilterCells(null);
        }
      })
    }

    // update the layout when the window changes size
    window.addEventListener('resize', () => {
      this.Update(false);
    });

    // show about page for cell when clicked
    document.querySelectorAll(LayoutManager.cellContentsSelector).forEach(cellContent => {
      cellContent.addEventListener("click", () => {
        // @ts-ignore
        const cellId = parseInt(cellContent.parentElement.attributes[LayoutManager.cellIDAttribute].value, 10);
        const about = document.querySelector(LayoutManager.aboutViewPartialSelector + cellId)!;

        if (about.classList.contains(LayoutManager.aboutViewEnabledClass) === false) {
          about.classList.add(LayoutManager.aboutViewEnabledClass);
        }
      })
    });

    // show about me when contact menu item is clicked
    this.contactLink.addEventListener("click", () => {
      if (this.contactPage.classList.contains(LayoutManager.aboutViewEnabledClass) === false) {
        // close any cells about views first
        document.querySelectorAll(LayoutManager.aboutViewsSelector).forEach(
            x => x.classList.remove(LayoutManager.aboutViewEnabledClass)
        );

        this.contactPage.classList.add(LayoutManager.aboutViewEnabledClass);
        this.contactLink.classList.add(LayoutManager.menuItemSelectedClass);
      } else {
        this.contactPage.classList.remove(LayoutManager.aboutViewEnabledClass);
        this.contactLink.classList.remove(LayoutManager.menuItemSelectedClass);
      }
    });

    // close about view when clicked
    document.querySelectorAll(LayoutManager.aboutViewsSelector).forEach(aboutItem => {
      aboutItem.addEventListener('click', () => {
        aboutItem.classList.remove(LayoutManager.aboutViewEnabledClass);
      });
    });

    // add a class to enabled some animations which are waiting to be triggered
    document.body.classList.add(LayoutManager.enableAnimationClass);
  }


  // group the cells into chunks
  public static* GetGroupedCells(cells: Cell[], groupSize: number)  {
    const iter = cells[Symbol.iterator]();
    let groupedCells = [];

    while (true) {
      const next = iter.next();

      if (next.done === true) {
        break
      }

      groupedCells.push(next.value);

      if (groupedCells.length === groupSize) {
        yield groupedCells;
        groupedCells = [];
      }
    }

    if (groupedCells.length >= 1) {
      yield groupedCells;
    }

  }

  // enable and disable cells based upon the supplied tag
  private FilterCells = (tag: string | null) => {
    this.cells.forEach(cell => {
      if (tag !== null) {
        cell.enabled = (cell.tags.has(tag) === true);
      } else {
        cell.enabled = true;
      }
    });

    this.Update(false);
  };

  // split the cells into those which are enabled and which are disabled
  private CategoriseCells() {
    const cellsEnabled: Cell[] = [];
    const cellsDisabled: Cell[] = [];

    for (const cell of this.cells) {
      if (cell.enabled === true) {
        cellsEnabled.push(cell);
      } else {
        cellsDisabled.push(cell);
      }
    }

    return [cellsEnabled, cellsDisabled];
  }

  // find out how many columns to use based upon the page width
  private GetColumnCount = () => {
    const width = this.container.clientWidth;
    const headerWidth = 300;
    const minimumCellWidth = 300;

    if (width > headerWidth + minimumCellWidth * 3) {
      return 3;
    }

    if (width > headerWidth + minimumCellWidth * 2) {
      return 2;
    }

    return 1;
  };

  // update the layout of the cells
  public Update = (firstRun: boolean) => {
    const [cellsEnabled, cellsDisabled] = this.CategoriseCells();
    const columnCount = this.GetColumnCount();
    const pageWidth = this.container.clientWidth;
    const pageHeight = document.body.clientHeight;
    const cellWidth = pageWidth / columnCount;
    const cellHeight = cellWidth * (3 / 4);
    const maxRows = Math.ceil(this.cells.length / columnCount);
    const rowCount = Math.ceil(cellsEnabled.length / columnCount);

    this.container.style.height = `${maxRows * cellHeight}px`;


    for (const cell of cellsDisabled) {
      cell.element.style.opacity = "0";
      cell.element.style.pointerEvents = "none";

      // a cell should only animate its (x, y) position when its before and after state are both visible,
      // in order to do this we need to keep track of when it actually becomes invisible (after the fade out
      // animation) rather than just when its enabled state changes
      if (cell.isVisible === true) {
        //cancel any existing timeout
        cell.CancelTimeout();

        cell.timeoutID = setTimeout(function() {
          cell.isVisible = false;
        },  LayoutManager.animationSpeed);
      }
    }

    let i = 0;
    for (const groupedCells of LayoutManager.GetGroupedCells(cellsEnabled, columnCount)) {
      for (const cell of groupedCells) {
        const row = Math.floor(i / columnCount);
        const column = i % columnCount;

        const xOffset = ((columnCount - groupedCells.length) * cellWidth) / 2;
        const yOffset = Math.max(pageHeight - (rowCount * cellHeight), 0) / 2;
        const x = (column * cellWidth) + xOffset;
        const y = (row * cellHeight) + yOffset;

        let transform = `translate(${x}px, ${y}px)`;

        let transition = "opacity 1.5s, width 1.5s, height 1.5s";
        if (firstRun === false && cell.isVisible === true) {
          transition += ", transform 1.5s"
        }

        cell.isVisible = true;
        cell.CancelTimeout();

        cell.element.style.width = `${cellWidth}px`;
        cell.element.style.height = `${cellHeight}px`;
        cell.element.style.transform = transform;
        cell.element.style.transition = transition;
        cell.element.style.opacity = "1";
        cell.element.style.pointerEvents = "auto";

        i += 1;
      }
    }
  };
}

console.log(
    "Hello, you can find the source code for this website here:\n" +
    "https://github.com/tom-churchill/personal-website"
);

const layoutManager = new LayoutManager();
layoutManager.Update(true);